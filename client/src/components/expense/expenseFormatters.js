export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function categoriesForType(categories, type) {
  const incomeCategories = ['Salary', 'Other income'];
  return categories.filter((category) => (
    type === 'income'
      ? incomeCategories.includes(category)
      : !incomeCategories.includes(category)
  ));
}
