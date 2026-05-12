const EXPENSE_CATEGORIES = Object.freeze([
  'Comida',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Cuidado personal',
  'Limpieza del hogar',
  'Ropa',
  'Mascotas',
  'Servicios financieros',
  'Otro',
]);

const CATEGORY_KEYWORDS = [
  {
    category: 'Comida',
    keywords: [
      'comida',
      'almuerzo',
      'desayuno',
      'cena',
      'snack',
      'merienda',
      'restaurante',
      'mercado',
      'super',
      'delivery',
      'pedido',
      'cafeteria',
      'cafe',
      'alimentos',
    ],
  },
  {
    category: 'Transporte',
    keywords: [
      'transporte',
      'uber',
      'taxi',
      'bus',
      'pasaje',
      'pasajes',
      'metro',
      'tren',
      'gasolina',
      'combustible',
      'movilidad',
      'indrive',
      'ride',
    ],
  },
  {
    category: 'Vivienda',
    keywords: [
      'alquiler',
      'renta',
      'arriendo',
      'casa',
      'hogar',
      'luz',
      'agua',
      'internet',
      'electricidad',
      'servicio',
      'servicios',
      'mantenimiento',
    ],
  },
  {
    category: 'Salud',
    keywords: [
      'salud',
      'medicina',
      'medico',
      'doctor',
      'farmacia',
      'consulta',
      'hospital',
      'dental',
      'terapia',
      'clinica',
    ],
  },
  {
    category: 'Educación',
    keywords: [
      'educacion',
      'educación',
      'universidad',
      'matricula',
      'matrícula',
      'curso',
      'clase',
      'libro',
      'material',
      'escuela',
      'colegio',
      'tarea',
    ],
  },
  {
    category: 'Entretenimiento',
    keywords: [
      'entretenimiento',
      'cine',
      'pelicula',
      'película',
      'fiesta',
      'salida',
      'bar',
      'juego',
      'juegos',
      'netflix',
      'spotify',
      'streaming',
      'ocio',
      'concierto',
    ],
  },
  {
    category: 'Cuidado personal',
    keywords: [
      'cuidado personal',
      'higiene',
      'shampoo',
      'jabon',
      'jabon liquido',
      'desodorante',
      'crema',
      'skin care',
      'skincare',
      'cepillo',
      'pasta dental',
      'toallas sanitarias',
      'insumos de cuidado personal',
    ],
  },
  {
    category: 'Limpieza del hogar',
    keywords: [
      'limpieza',
      'limpieza del hogar',
      'detergente',
      'lavandina',
      'cloro',
      'desinfectante',
      'esponja',
      'papel higienico',
      'servilletas',
      'insumos de limpieza',
      'limpiador',
    ],
  },
  {
    category: 'Ropa',
    keywords: [
      'ropa',
      'camisa',
      'pantalon',
      'pantalón',
      'zapatos',
      'zapatillas',
      'tenis',
      'vestido',
      'chaqueta',
      'moda',
      'accesorios',
    ],
  },
  {
    category: 'Mascotas',
    keywords: [
      'mascota',
      'mascotas',
      'perro',
      'gato',
      'veterinaria',
      'veterinario',
      'alimento para perro',
      'alimento para gato',
      'arena para gato',
      'petshop',
    ],
  },
  {
    category: 'Servicios financieros',
    keywords: [
      'comision bancaria',
      'comisión bancaria',
      'banco',
      'interes',
      'interés',
      'tarjeta',
      'mantenimiento cuenta',
      'seguro',
      'cuota',
      'financiero',
      'servicios financieros',
    ],
  },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isExpenseCategory(value) {
  return EXPENSE_CATEGORIES.includes(String(value || ''));
}

function clasificarGasto(texto, categoriaActual = '') {
  const current = String(categoriaActual || '').trim();
  if (isExpenseCategory(current) && current !== 'Otro') {
    return current;
  }

  const normalized = normalizeText(texto);
  if (!normalized) {
    return isExpenseCategory(current) ? current : 'Otro';
  }

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return rule.category;
    }
  }

  return isExpenseCategory(current) ? current : 'Otro';
}

module.exports = {
  EXPENSE_CATEGORIES,
  clasificarGasto,
  isExpenseCategory,
};
