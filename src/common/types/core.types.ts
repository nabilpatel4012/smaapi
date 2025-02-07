export interface IProjectBody {
  project_name: string;
  project_description?: string;
  tags?: object;
}

export interface IProjectQueryParams {
  page?: number;
  size?: number;
  name?: string;
}

export interface IProjectReply {
  project_id: number;
  user_id: number;
  project_name: string;
  project_description?: string | null;
  tags?: object | null;
  created_at: Date | string;
}
