interface ResponseData {
  statusCode: number;
  status: string;
  message: string;
  data?: unknown;
  type?: unknown;
}

export const response = (payload: ResponseData = {} as ResponseData) => {
  const responseObject: {
    code: number;
    status: string;
    message: string;
    data?: unknown;
    meta?: unknown;
  } = {
    code: payload.statusCode,
    message: payload.message,
    status: payload.status,
  };

  if (payload.data !== undefined) responseObject.data = payload.data;
  if (payload.type !== undefined) responseObject.meta = payload.type;
  return responseObject;
};
