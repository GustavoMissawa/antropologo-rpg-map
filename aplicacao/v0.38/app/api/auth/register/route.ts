import { authenticate } from '../../../../lib/auth-route';
export const POST=(request:Request)=>authenticate(request,true);
