export function isEth(tokenAddress) {
  if (!tokenAddress) return false;
  return (
    tokenAddress.toLowerCase() === "0x000000000000000000000000000000000000000e"
  );
}
