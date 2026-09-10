const PRESENCE_IN_STOCK_QUANTITY = 1;

export function isPresenceInStock(quantity: number): boolean {
  return quantity > 0;
}

export function presenceQuantity(inStock: boolean): number {
  return inStock ? PRESENCE_IN_STOCK_QUANTITY : 0;
}

export function tracksPresence(
  ingredient: { trackPresence?: boolean } | null | undefined
): boolean {
  return ingredient?.trackPresence === true;
}
