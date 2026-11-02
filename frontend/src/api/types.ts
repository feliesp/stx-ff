// Shapes returned by the FastAPI backend (see backend/app/flags/schemas.py).

export type Flag = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

// RFC 9457 Problem Details: the shape of every API error.
export type Problem = {
  type: string;
  title: string;
  status: number;
  errors?: Record<string, string[]>;
  request_id?: string | null;
  current?: Flag;
};
