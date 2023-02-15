import {JoiSchema, JoiSchemaOptions} from "nestjs-joi";
import * as Joi from "joi";

@JoiSchemaOptions({
  allowUnknown: false,
})
export class PostDownloadBodyDto {
  @JoiSchema(Joi.string().required())
  documentId: string;
}
