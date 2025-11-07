import { BaseService } from './base';
import { formatDate } from './utils';

export interface IUser {
  id: number;
  name: string;
}

export class UserService extends BaseService {
  private users: IUser[] = [];

  constructor() {
    super('UserService');
  }

  addUser(user: IUser): void {
    this.users.push(user);
    this.logAction('add');
  }

  getUser(id: number): IUser | undefined {
    return this.users.find(u => u.id === id);
  }

  private logAction(action: string): void {
    const timestamp = formatDate(new Date());
    console.log(`[${timestamp}] ${action} user`);
  }
}
