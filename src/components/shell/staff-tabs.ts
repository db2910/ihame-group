// Spec nav-chrome table: Freight staff -> My orders / New order / Customers.
// Shop staff -> Sale / Today's sales / Stock lookup.
export const FREIGHT_STAFF_TABS = [
  { key: "orders", label: "My orders", href: "/orders" },
  { key: "new-order", label: "New order", href: "/orders/new" },
  { key: "customers", label: "Customers", href: "/customers" },
];

export const SHOP_STAFF_TABS = [
  { key: "sale", label: "Sale", href: "/sale" },
  { key: "today", label: "Today's sales", href: "/sale/today" },
  { key: "stock-lookup", label: "Stock lookup", href: "/sale/stock-lookup" },
];
