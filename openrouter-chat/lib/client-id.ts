type ClientCrypto = {
  randomUUID?: () => string;
};

export function createClientId(
  prefix: string,
  cryptoLike: ClientCrypto | undefined = globalThis.crypto,
) {
  const randomPart =
    typeof cryptoLike?.randomUUID === "function"
      ? cryptoLike.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${randomPart}`;
}
