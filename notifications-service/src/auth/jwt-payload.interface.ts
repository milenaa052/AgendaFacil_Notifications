export interface JwtPayload {
  idUser: number;
  name: string;
  email: string;
  userType: 'CUSTOMER' | 'COMPANY';
}