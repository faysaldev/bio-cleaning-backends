import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";

const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  const url = req.body.file; // Assuming the middleware puts the URL in req.body.file

  res.status(httpStatus.OK).json(
    response({
      message: "Asset uploaded successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { url, publicId: url.split("/").pop()?.split(".")[0] },
    })
  );
});

const assetController = {
  uploadAsset,
};

export default assetController;
