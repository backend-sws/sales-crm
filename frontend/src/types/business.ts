export interface Business {
  id: number;
  name: string;
  owner_id?: number;
  email: string | null;
  phone: string | null;
  phone_2: string | null;
  gst_number: string | null;
  address: string | null;
  pincode: string | null;
  state: string | null;
  description: string | null;
  business_type: string | null;
  business_category: string | null;
  books_opening_date: string | null;
  logo_path: string | null;
  signature_path: string | null;
  card_preferences: {
    show_address?: boolean;
    show_email?: boolean;
    show_phone_2?: boolean;
    show_gst?: boolean;
    theme?: 'dark' | 'blue' | 'green' | 'purple' | 'primary';
  } | null;
  settings?: {
    whitelabel_name?: string | null;
    whitelabel_logo?: string | null;
    whitelabel_favicon?: string | null;
    commission_calculation_base?: 'sales' | 'profit';
    sale_invoice_prefix?: string;
    purchase_invoice_prefix?: string;
    [key: string]: any;
  } | null;
  plan_id?: number | null;
  plan_expires_at?: string | null;
  plan?: {
    name: string;
    features?: Record<string, boolean | number>;
  } | null;
  custom_features?: Record<string, boolean | 'hidden'> | null;
}
