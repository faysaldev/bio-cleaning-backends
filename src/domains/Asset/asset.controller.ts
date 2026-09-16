import { Request, Response } from "express";
import httpStatus from "http-status";
import { response } from "../../lib/response";
import { asyncHandler } from "../../lib/errorsHandle";
import { enqueueMediaOptimization } from "../MediaProcessing/mediaProcessing.service";

const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  const url = req.body.file;
  const job = await enqueueMediaOptimization(url);

  res.status(httpStatus.OK).json(
    response({
      message: "Asset uploaded successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { url, publicId: url.split("/").pop()?.split(".")[0], processing: job ? "QUEUED" : "SKIPPED" },
    })
  );
});

const assetController = {
  uploadAsset,
};

export default assetController;
