export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return String(dateStr);
  }
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return String(dateStr);
  }
};

export const formatDateWithDays = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const formatted = formatDate(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `${formatted} (in ${diffDays} days)`;
    if (diffDays === 1) return `${formatted} (Tomorrow)`;
    if (diffDays === 0) return `${formatted} (Today)`;
    if (diffDays === -1) return `${formatted} (Yesterday)`;
    return `${formatted} (${Math.abs(diffDays)} days ago)`;
  } catch {
    return String(dateStr);
  }
};

export const numberToIndianWords = (amount: number | string | null | undefined): string => {
  const num = Math.round(Number(amount || 0) * 100) / 100;
  if (isNaN(num) || num <= 0) {
    return 'Zero Rupees Only';
  }

  const [rupeesStr, paiseStr] = num.toFixed(2).split('.');
  let rupees = parseInt(rupeesStr, 10);
  const paise = parseInt(paiseStr, 10);

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convert = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 10000000) {
      str += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += convert(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += convert(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += units[n] + ' ';
      } else {
        str += tens[Math.floor(n / 10)] + ' ';
        if (n % 10 > 0) {
          str += units[n % 10] + ' ';
        }
      }
    }
    return str.trim();
  };

  let words = convert(rupees) + ' Rupees';
  if (paise > 0) {
    words += ' and ' + convert(paise) + ' Paise';
  }

  return (words.trim() + ' Only').replace(/\s+/g, ' ');
};

