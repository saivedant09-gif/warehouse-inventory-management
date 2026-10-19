// Utility validator functions for backend requests

const isPositiveInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

const isNonNegativeNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
};

const isValidDateString = (dateStr) => {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
};

const validateProduct = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Product name is required and cannot be empty.');
  }
  if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
    errors.push('Category is required and cannot be empty.');
  }
  if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
    if (!isNonNegativeNumber(data.weight)) {
      errors.push('Weight must be a non-negative number.');
    }
  }
  if (data.expiry_date) {
    if (!isValidDateString(data.expiry_date)) {
      errors.push('Expiry date must be in YYYY-MM-DD format.');
    }
  }
  return errors;
};

const validateWarehouseSection = (data) => {
  const errors = [];
  if (data.capacity === undefined || data.capacity === null || data.capacity === '') {
    errors.push('Capacity is required.');
  } else if (!isPositiveInteger(data.capacity)) {
    errors.push('Capacity must be a positive integer.');
  }

  if (data.temperature !== undefined && data.temperature !== null && data.temperature !== '') {
    if (isNaN(Number(data.temperature))) {
      errors.push('Temperature must be a valid number.');
    }
  }

  if (data.available_space !== undefined && data.available_space !== null && data.available_space !== '') {
    const avail = Number(data.available_space);
    const cap = Number(data.capacity);
    if (isNaN(avail) || avail < 0) {
      errors.push('Available space cannot be negative.');
    } else if (cap && avail > cap) {
      errors.push('Available space cannot exceed total capacity.');
    }
  }

  return errors;
};

const validateEmployee = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Employee name is required.');
  }
  if (!data.designation || typeof data.designation !== 'string' || !data.designation.trim()) {
    errors.push('Designation is required.');
  }
  if (!data.phone || typeof data.phone !== 'string' || !data.phone.trim()) {
    errors.push('Phone number is required.');
  } else if (data.phone.trim().length < 7 || data.phone.trim().length > 15) {
    errors.push('Phone number must be between 7 and 15 digits/characters.');
  }
  return errors;
};

const validateInventory = (data) => {
  const errors = [];
  if (!isPositiveInteger(data.product_id)) {
    errors.push('Valid product_id is required.');
  }
  if (!isPositiveInteger(data.section_id)) {
    errors.push('Valid section_id is required.');
  }
  if (!isPositiveInteger(data.employee_id)) {
    errors.push('Valid employee_id is required.');
  }
  if (data.quantity === undefined || !isPositiveInteger(data.quantity)) {
    errors.push('Quantity must be an integer greater than 0.');
  }
  if (!data.entry_date || !isValidDateString(data.entry_date)) {
    errors.push('Entry date is required and must be in YYYY-MM-DD format.');
  }
  if (data.exit_date && !isValidDateString(data.exit_date)) {
    errors.push('Exit date must be in YYYY-MM-DD format.');
  }
  if (data.exit_date && data.entry_date && new Date(data.exit_date) < new Date(data.entry_date)) {
    errors.push('Exit date cannot be earlier than entry date.');
  }
  if (!data.status || typeof data.status !== 'string' || !data.status.trim()) {
    errors.push('Status is required.');
  }
  return errors;
};

const validateDispatch = (data) => {
  const errors = [];
  if (!isPositiveInteger(data.employee_id)) {
    errors.push('Valid employee_id is required.');
  }
  if (!isPositiveInteger(data.inventory_id)) {
    errors.push('Valid inventory_id is required.');
  }
  if (!data.vehicle_no || typeof data.vehicle_no !== 'string' || !data.vehicle_no.trim()) {
    errors.push('Vehicle number is required.');
  }
  if (!data.date || !isValidDateString(data.date)) {
    errors.push('Dispatch date is required and must be in YYYY-MM-DD format.');
  }
  if (!data.destination || typeof data.destination !== 'string' || !data.destination.trim()) {
    errors.push('Destination is required.');
  }
  return errors;
};

module.exports = {
  isPositiveInteger,
  isNonNegativeNumber,
  isValidDateString,
  validateProduct,
  validateWarehouseSection,
  validateEmployee,
  validateInventory,
  validateDispatch
};
