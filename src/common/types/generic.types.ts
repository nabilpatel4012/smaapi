export interface IIdParams {
  id: number;
}

export interface ISuccessfulReply {
  message: string;
}

export interface IErrorReply {
  code?: number;
  message: string;
}
