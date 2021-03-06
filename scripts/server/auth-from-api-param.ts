import {
  IAuthUser,
  IAuthToken
} from "../auth";

import * as request from 'request';

import {
  TokenRepository,
  UserRepository
} from '../models';

import { ObjectID } from 'mongodb';

import {
  AtAuthError,
  AtCaptchaError
} from '../at-error';

import { Config } from "../config";

export async function token(apiParamToken: { id: string, key: string } | null, isAuthToken: "master" | "all" | "no"): Promise<IAuthToken | null> {
  if (apiParamToken === null) {
    if (isAuthToken === 'no') {
      return null;
    } else {
      throw new AtAuthError('認証が必要です');
    }
  }

  let token = await TokenRepository.findOne(new ObjectID(apiParamToken.id));
  let authToken = token.auth(apiParamToken.key);

  if (authToken.type !== 'master' && isAuthToken === 'master') {
    throw new AtAuthError('マスターキーで認証して下さい');
  }

  return authToken;
}

export async function user(apiParamUser: { id: string, pass: string } | null, isAuthUser: boolean): Promise<IAuthUser | null> {
  if (apiParamUser === null) {
    if (!isAuthUser) {
      return null;
    } else {
      throw new AtAuthError('認証が必要です');
    }
  }

  let user = await UserRepository.findOne(new ObjectID(apiParamUser.id));
  let authUser = user.auth(apiParamUser.pass);

  return authUser;
}

export async function recaptcha(apiParamRecaptcha: string | null, isRecaptcha: boolean) {
  if (apiParamRecaptcha === null && isRecaptcha) {
    throw new AtAuthError('キャプチャ認証が必要です');
  }

  if (!isRecaptcha) {
    return;
  }

  let result = await new Promise<string>((resolve, reject) => {
    request.post("https://www.google.com/recaptcha/api/siteverify", {
      form: {
        secret: Config.recaptcha.secretKey,
        response: apiParamRecaptcha
      }
    },
      (err, _res, body: string) => {
        if (err) {
          reject("キャプチャAPIでエラー");
        } else {
          resolve(body);
        }
      });
  });

  if (!JSON.parse(result).success) {
    throw new AtCaptchaError()
  }
}