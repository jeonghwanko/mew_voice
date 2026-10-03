export class ApiError extends Error {
  public details?: string;
  /**
   * 사용자에게 그대로 보여줄 한국어 문구 (opt-in).
   *
   * `message` 는 **wire error code**(`REDEEM_DISABLED` 등)라 errorHandler 는 이를
   * `{ error }` 로만 직렬화한다. 클라들은 `body.message ?? code` 를 Alert 본문에 띄우므로,
   * 이 필드를 채운 ApiError 만 응답에 `message` 가 붙는다(미설정 라우트는 기존 shape 유지).
   * `details` 는 기계 판독용(운영 로그·분석 분기)이며 사용자 문구가 아니다.
   */
  public userMessage?: string;
  constructor(
    public statusCode: number,
    message: string,
    details?: string,
    userMessage?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
    this.userMessage = userMessage;
  }
}
