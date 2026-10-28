export interface IndianStateOrUT {
  name: string;
  code: string;
  type: 'state' | 'ut' | 'other';
  isHomeState?: boolean;
}

export const INDIAN_STATES_AND_UTS: IndianStateOrUT[] = [
  // ─── 28 STATES ─────────────────────────────────────────────────────────────
  { name: 'Maharashtra', code: '27', type: 'state', isHomeState: true },
  { name: 'Andhra Pradesh', code: '37', type: 'state' },
  { name: 'Arunachal Pradesh', code: '12', type: 'state' },
  { name: 'Assam', code: '18', type: 'state' },
  { name: 'Bihar', code: '10', type: 'state' },
  { name: 'Chhattisgarh', code: '22', type: 'state' },
  { name: 'Goa', code: '30', type: 'state' },
  { name: 'Gujarat', code: '24', type: 'state' },
  { name: 'Haryana', code: '06', type: 'state' },
  { name: 'Himachal Pradesh', code: '02', type: 'state' },
  { name: 'Jharkhand', code: '20', type: 'state' },
  { name: 'Karnataka', code: '29', type: 'state' },
  { name: 'Kerala', code: '32', type: 'state' },
  { name: 'Madhya Pradesh', code: '23', type: 'state' },
  { name: 'Manipur', code: '14', type: 'state' },
  { name: 'Meghalaya', code: '17', type: 'state' },
  { name: 'Mizoram', code: '15', type: 'state' },
  { name: 'Nagaland', code: '13', type: 'state' },
  { name: 'Odisha', code: '21', type: 'state' },
  { name: 'Punjab', code: '03', type: 'state' },
  { name: 'Rajasthan', code: '08', type: 'state' },
  { name: 'Sikkim', code: '11', type: 'state' },
  { name: 'Tamil Nadu', code: '33', type: 'state' },
  { name: 'Telangana', code: '36', type: 'state' },
  { name: 'Tripura', code: '16', type: 'state' },
  { name: 'Uttar Pradesh', code: '09', type: 'state' },
  { name: 'Uttarakhand', code: '05', type: 'state' },
  { name: 'West Bengal', code: '19', type: 'state' },

  // ─── 8 UNION TERRITORIES ───────────────────────────────────────────────────
  { name: 'Andaman and Nicobar Islands', code: '35', type: 'ut' },
  { name: 'Chandigarh', code: '04', type: 'ut' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26', type: 'ut' },
  { name: 'Delhi', code: '07', type: 'ut' },
  { name: 'Jammu and Kashmir', code: '01', type: 'ut' },
  { name: 'Ladakh', code: '38', type: 'ut' },
  { name: 'Lakshadweep', code: '31', type: 'ut' },
  { name: 'Puducherry', code: '34', type: 'ut' },

  // ─── OTHER / OVERSEAS ──────────────────────────────────────────────────────
  { name: 'Other', code: '96', type: 'other' },
];

export const INDIAN_STATES = INDIAN_STATES_AND_UTS.filter((item) => item.type === 'state');
export const INDIAN_UTS = INDIAN_STATES_AND_UTS.filter((item) => item.type === 'ut');

export function getGstLabelForState(item: IndianStateOrUT): string {
  if (item.isHomeState) {
    return `${item.name} (${item.code}) — Intra-state: CGST 9% + SGST 9%`;
  }
  if (item.type === 'other') {
    return 'Other State / Overseas — IGST 18%';
  }
  return `${item.name} (${item.code}) — Inter-state: IGST 18%`;
}
