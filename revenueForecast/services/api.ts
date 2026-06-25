
import { UserProfile, ValuationResult, TransactionRecord, PkSession, PkStatus } from '../types';
import { calculateFate } from '../utils';

// --- 常量定义 ---
const STORAGE_KEYS = {
  USER: 'tb_user_profile',
  TRANSACTIONS: 'tb_transactions',
  PK_SESSIONS: 'tb_pk_sessions',
};

// --- 模拟网络延迟 ---
const mockRequest = <T>(data: T, ms: number = 300): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

// --- 后端服务类 ---
class ApiService {
  private user: UserProfile | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  // 1. 用户系统：自动注册/登录
  private loadUserFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored && stored !== 'undefined' && stored !== 'null') {
        this.user = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("loadUserFromStorage failed", e);
    }
  }

  public async loginOrRegister(): Promise<UserProfile> {
    if (this.user) return mockRequest(this.user);

    // 模拟注册新用户
    const newUser: UserProfile = {
      id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      token: `tk_${Math.random().toString(36).substr(2)}`,
      nickname: '翻身用户',
      avatar: 'VIP',
      createdAt: Date.now(),
      bestValuation: null,
    };

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    this.user = newUser;
    
    // 注册时赠送初始流水
    this.addTransaction({
       type: 'income',
       category: '系统',
       title: '新手翻身启动金',
       amount: 666.00,
       status: 'success',
       remark: '来自财神爷的关照'
    });

    return mockRequest(newUser);
  }

  public getUser(): UserProfile | null {
    return this.user;
  }

  // 2. 核心业务：保存估值结果
  public async saveValuation(result: ValuationResult): Promise<void> {
    if (!this.user) await this.loginOrRegister();
    
    // 更新最高身价
    if (!this.user!.bestValuation || result.valuation > this.user!.bestValuation) {
        this.user!.bestValuation = result.valuation;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
    }

    // 记录一条“评估入账”流水（虚拟）
    await this.addTransaction({
        type: 'income',
        category: '估值',
        title: '2026 身价预估入账',
        amount: result.valuation,
        status: 'pending', // 冻结状态
        remark: '资金监管中，需好友担保解冻'
    });
  }

  // 3. 资产流水系统
  public async getTransactions(): Promise<TransactionRecord[]> {
    let list: TransactionRecord[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      list = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("getTransactions failed", e);
    }
    
    // 如果列表为空，填充一些假数据让界面好看（模拟后端返回默认数据）
    if (list.length <= 1) { // 只有注册送的那一条
        const defaults = this.generateDefaultTransactions(this.user?.id || 'temp');
        list = [...list, ...defaults];
    }
    
    return mockRequest(list.sort((a, b) => b.timestamp - a.timestamp));
  }

  private async addTransaction(record: Omit<TransactionRecord, 'id' | 'userId' | 'timestamp'>) {
    let list: TransactionRecord[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      list = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("addTransaction load transactions failed", e);
    }
    
    const newRecord: TransactionRecord = {
        id: `tx_${Date.now()}`,
        userId: this.user?.id || 'unknown',
        timestamp: Date.now(),
        ...record
    };

    list.unshift(newRecord);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    } catch (e) {
      console.warn("addTransaction save transactions failed", e);
    }
  }

  // 4. PK 房系统
  public async createPkSession(myValuation: number): Promise<string> {
      if (!this.user) throw new Error("Unauthorized");

      const sessionId = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const session: PkSession = {
          id: sessionId,
          creatorId: this.user.id,
          status: 'CREATED',
          creatorValuation: myValuation,
          createdAt: Date.now()
      };

      this.saveSession(session);
      return mockRequest(sessionId);
  }

  public async updatePkStatus(sessionId: string, status: PkStatus): Promise<void> {
      const session = this.getSession(sessionId);
      if (session) {
          session.status = status;
          this.saveSession(session);
      }
      return mockRequest(undefined, 100);
  }

  // 模拟好友加入（因为是单机演示，这里通过后端逻辑触发“好友”数据生成）
  public async simulateOpponentJoin(sessionId: string): Promise<ValuationResult> {
      const session = this.getSession(sessionId);
      if (!session) throw new Error("Session not found");

      // 模拟一个好友数据
      const mockInput = {
        name: "神秘挑战者",
        birthdate: '1995-01-01',
        gender: Math.random() > 0.5 ? 'male' : 'female'
      };
      // 计算好友身价 (根据房主身价浮动，增加PK趣味性)
      // 这里的 calculateFate 是纯计算函数，可以直接调用
      let opRes = calculateFate(mockInput as any);
      
      // 强制让身价有点波动
      const variance = (Math.random() - 0.5) * 2; // -1 to 1
      // 简单模拟一下数值差异，实际逻辑在 frontend utils 里已经很完善了，这里主要为了产生 ValuationResult
      
      session.challengerId = `guest_${Date.now()}`;
      session.challengerValuation = opRes.valuation;
      session.status = 'JOINED';
      
      this.saveSession(session);
      
      return mockRequest(opRes, 1500); // 模拟网络延迟 1.5s
  }

  public async getPkSession(sessionId: string): Promise<PkSession | null> {
      return mockRequest(this.getSession(sessionId), 100);
  }

  // --- Helpers ---
  private getSession(id: string): PkSession | undefined {
      try {
          const stored = localStorage.getItem(STORAGE_KEYS.PK_SESSIONS);
          const all = stored ? JSON.parse(stored) : {};
          return all[id];
      } catch (e) {
          console.warn("getSession failed", e);
          return undefined;
      }
  }

  private saveSession(session: PkSession) {
      try {
          const stored = localStorage.getItem(STORAGE_KEYS.PK_SESSIONS);
          const all = stored ? JSON.parse(stored) : {};
          all[session.id] = session;
          localStorage.setItem(STORAGE_KEYS.PK_SESSIONS, JSON.stringify(all));
      } catch (e) {
          console.warn("saveSession failed", e);
      }
  }

  private generateDefaultTransactions(uid: string): TransactionRecord[] {
      return [
        { id: 'b-1', userId: uid, timestamp: Date.now() - 100000, type: 'income', category: '转账', title: '财神爷的红包', amount: 88888.00, status: 'success', remark: '马年开工利是' },
        { id: 'b-2', userId: uid, timestamp: Date.now() - 200000, type: 'income', category: '工资', title: '翻身银行财务', amount: 3500.00, status: 'success', remark: '精神损失费（窝囊费）' },
        { id: 'b-3', userId: uid, timestamp: Date.now() - 800000, type: 'income', category: '奖金', title: '颜值溢价补贴', amount: 50000.00, status: 'success', remark: '长得好看也是生产力' },
        { id: 'b-4', userId: uid, timestamp: Date.now() - 9000000, type: 'income', category: '理财', title: '吗喽基金分红', amount: 1024.00, status: 'success', remark: '咸鱼翻身启动金' },
      ];
  }
}

export const api = new ApiService();
