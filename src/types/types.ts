export interface ProtectedUser {
  _id: string; // Explicitly typing _id
  name: string;
  email: string;
  password: string;
  image: string;
  role: string;
  dateOfBirth: string;
}
