INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 2T Terpel Celerity',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  25000,
  NULL,
  NULL,
  'img/motocelerity2t.webp',
  'aceite-2t-terpel-celerity',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 2T Terpel Celerity'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Terpel Celerity 20W-50',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  31000,
  NULL,
  NULL,
  'img/motocelerity4t.webp',
  'aceite-4t-terpel-celerity-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Terpel Celerity 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Terpel Celerity 15W-50',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  32000,
  NULL,
  NULL,
  'img/aceite4t.webp',
  'aceite-4t-terpel-celerity-15w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Terpel Celerity 15W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Mobil Super 20W-50',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  34000,
  NULL,
  NULL,
  'img/mobil4t.webp',
  'aceite-4t-mobil-super-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Mobil Super 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Motul 5000 20W-50',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  37000,
  NULL,
  NULL,
  'img/motul5000.webp',
  'aceite-4t-motul-5000-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Motul 5000 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Motul 5100 15W-50',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  42000,
  NULL,
  NULL,
  'img/motul5100.webp',
  'aceite-4t-motul-5100-15w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Motul 5100 15W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite 4T Motul 7100 10W-40',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  60000,
  NULL,
  NULL,
  'img/motul7100.webp',
  'aceite-4t-motul-7100-10w-40',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite 4T Motul 7100 10W-40'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Terpel Celerity 25W-50 Grueso',
  'Para Moto · Protección extrema',
  'aceite',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  27000,
  NULL,
  NULL,
  'img/terpel4tcarrito.webp',
  'aceite-terpel-celerity-25w-50-grueso',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Terpel Celerity 25W-50 Grueso'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Valvulina GoldMax Gear para Cajas',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  10000,
  NULL,
  NULL,
  'img/maxgear.webp',
  'valvulina-goldmax-gear-para-cajas',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Valvulina GoldMax Gear para Cajas'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Shell SPIRAX para Diferenciales S2 A 80W-90',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  28000,
  NULL,
  NULL,
  'img/acietediferenciales.webp',
  'aceite-shell-spirax-para-diferenciales-s2-a-80w-90',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Shell SPIRAX para Diferenciales S2 A 80W-90'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Terpel Oiltec 20W-50 Multigrado',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  113000,
  NULL,
  NULL,
  'img/terpeloiltec.webp',
  'aceite-terpel-oiltec-20w-50-multigrado',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Terpel Oiltec 20W-50 Multigrado'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Terpel Oiltec 20W-50',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  32000,
  NULL,
  NULL,
  'img/terpeloiltec20w.webp',
  'aceite-terpel-oiltec-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Terpel Oiltec 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Terpel Ultrek 50 Monogrado',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  100000,
  NULL,
  NULL,
  'img/terpelultrek50.webp',
  'aceite-terpel-ultrek-50-monogrado',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Terpel Ultrek 50 Monogrado'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Havoline 20W-50',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  100000,
  NULL,
  NULL,
  'img/havoline20w-50.webp',
  'aceite-havoline-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Havoline 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Petronas SYNTIUM 1L 500 20W-50',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  27000,
  NULL,
  NULL,
  'img/petronassyntium.webp',
  'aceite-petronas-syntium-1l-500-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Petronas SYNTIUM 1L 500 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Petronas SYNTIUM 4L 500 20W-50',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  105000,
  NULL,
  NULL,
  'img/petronassyntium500.webp',
  'aceite-petronas-syntium-4l-500-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Petronas SYNTIUM 4L 500 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Mobil Super 1000 20W-50',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  130000,
  NULL,
  NULL,
  'img/mobilsuper1000.webp',
  'aceite-mobil-super-1000-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Mobil Super 1000 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Mobil Super 2000 10W-30',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  44000,
  NULL,
  NULL,
  'img/mobilsuper2000.webp',
  'aceite-mobil-super-2000-10w-30',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Mobil Super 2000 10W-30'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Shell HELIX HX7 10W-40',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  43000,
  NULL,
  NULL,
  'img/shellhx7.webp',
  'aceite-shell-helix-hx7-10w-40',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Shell HELIX HX7 10W-40'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Mobil Hidráulico AW 68',
  'Para Carro · Protección extrema',
  'aceite',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  24000,
  NULL,
  NULL,
  'img/mobilhidraulico.webp',
  'aceite-mobil-hidraulico-aw-68',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Mobil Hidráulico AW 68'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Mobil Delvac Modern 15W-40',
  'Para Camión · Uso pesado',
  'aceite',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  120000,
  NULL,
  NULL,
  'img/mobildelvac.webp',
  'aceite-mobil-delvac-modern-15w-40',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Mobil Delvac Modern 15W-40'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite ACDelco SAE 20W-50',
  'Para Camión · Uso pesado',
  'aceite',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  100000,
  NULL,
  NULL,
  'img/acdelco.webp',
  'aceite-acdelco-sae-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite ACDelco SAE 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Shell HELIX HX5 20W-50',
  'Para Camión · Uso pesado',
  'aceite',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  140000,
  NULL,
  NULL,
  'img/shellhelix.webp',
  'aceite-shell-helix-hx5-20w-50',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Shell HELIX HX5 20W-50'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Shell SPIRAX S2 A 85W-140',
  'Para Camión · Uso pesado',
  'aceite',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  28000,
  NULL,
  NULL,
  'img/aceitespirax.webp',
  'aceite-shell-spirax-s2-a-85w-140',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Shell SPIRAX S2 A 85W-140'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aceite Castrol GTX 10W-40',
  'Para Camión · Uso pesado',
  'aceite',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  46000,
  NULL,
  NULL,
  'img/gastrolgtx.webp',
  'aceite-castrol-gtx-10w-40',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aceite Castrol GTX 10W-40'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Refrigerante Radiador Premium-Coolant',
  'Para Carro · Protección extrema',
  'refrigerante',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  15000,
  NULL,
  NULL,
  'img/refrigerante.webp',
  'refrigerante-radiador-premium-coolant',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Refrigerante Radiador Premium-Coolant'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Refrigerante Mobil Permazone',
  'Para Carro · Protección extrema',
  'refrigerante',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  24000,
  NULL,
  NULL,
  'img/mobilrefrigerante.webp',
  'refrigerante-mobil-permazone',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Refrigerante Mobil Permazone'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Refrigerante Terpel',
  'Para Carro · Protección extrema',
  'refrigerante',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  10000,
  NULL,
  NULL,
  'img/terpelrefrigerante.webp',
  'refrigerante-terpel',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Refrigerante Terpel'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Refrigerante Radiador Premium-Coolant 1 Galón',
  'Protección para el sistema de refrigeración.',
  'refrigerante',
  'camion',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  35000,
  NULL,
  NULL,
  'img/refrigerante1galon.webp',
  'refrigerante-radiador-premium-coolant-1-galon',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Refrigerante Radiador Premium-Coolant 1 Galón'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Aditivo Aceite',
  'Para Carro · Protección extrema',
  'aditivo',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  26000,
  NULL,
  NULL,
  'img/aditivo.webp',
  'aditivo-aceite',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Aditivo Aceite'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Lubricante Lubristone',
  'Para Carro · Protección extrema',
  'lubricante',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  8000,
  NULL,
  NULL,
  'img/lubricante.webp',
  'lubricante-lubristone',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Lubricante Lubristone'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Lubricante Cadenas Urbanas',
  'Para Moto · Protección extrema',
  'lubricante',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  30000,
  NULL,
  NULL,
  'img/lubricantescadena.webp',
  'lubricante-cadenas-urbanas',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Lubricante Cadenas Urbanas'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Filtros Para Carros',
  'Pregunta por todos los filtros disponibles.',
  'filtros',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/filtros.webp',
  'filtros-para-carros',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Filtros Para Carros'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Filtro MF-11 Yamaha YBR-125',
  'Para Moto',
  'filtros',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/filtro1.webp',
  'filtro-mf-11-yamaha-ybr-125',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Filtro MF-11 Yamaha YBR-125'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Filtro ML-07',
  'Para Moto',
  'filtros',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/filtro2.webp',
  'filtro-ml-07',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Filtro ML-07'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Filtro ML-05',
  'Para Moto',
  'filtros',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  3000,
  NULL,
  NULL,
  'img/filtro3.webp',
  'filtro-ml-05',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Filtro ML-05'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Kit carretera',
  'Elementos esenciales para tu vehículo.',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  50000,
  NULL,
  NULL,
  'img/kitcarretera.webp',
  'kit-carretera',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Kit carretera'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Impermeables plásticos',
  'Para Moto',
  'esenciales',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  10000,
  NULL,
  NULL,
  'img/impercap.webp',
  'impermeables-plasticos',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Impermeables plásticos'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Líquido de frenos Terpel',
  'Para Carro',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/liquidofrenos.webp',
  'liquido-de-frenos-terpel',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Líquido de frenos Terpel'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Grasas Star Oil',
  'Para moto y carro.',
  'esenciales',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/grasa.webp',
  'grasas-star-oil',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Grasas Star Oil'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Plumillas',
  'Para Carro',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/accesorio.webp',
  'plumillas',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Plumillas'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Renovador Partes Negras',
  'Para carros y motos.',
  'esenciales',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  14000,
  NULL,
  NULL,
  'img/partesnegras.webp',
  'renovador-partes-negras',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Renovador Partes Negras'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Líquido Frenos COFRE Brake Fluid',
  'Protección extrema.',
  'esenciales',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  29000,
  NULL,
  NULL,
  'img/liquidoparafrenos2.webp',
  'liquido-frenos-cofre-brake-fluid',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Líquido Frenos COFRE Brake Fluid'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Silicona Ultra-Rápida',
  'Protección extrema.',
  'esenciales',
  'moto',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  16000,
  NULL,
  NULL,
  'img/silicona.webp',
  'silicona-ultra-rapida',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Silicona Ultra-Rápida'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Shampoo con cera autobrillante',
  'Para Carro · Limpieza',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  36000,
  NULL,
  NULL,
  'img/shampoo.webp',
  'shampoo-con-cera-autobrillante',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Shampoo con cera autobrillante'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Limpiador de Cuero con Acondicionador',
  'Para Carro · Limpieza',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  48000,
  NULL,
  NULL,
  'img/cuero.webp',
  'limpiador-de-cuero-con-acondicionador',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Limpiador de Cuero con Acondicionador'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Limpiador Electrónico',
  'Para Carro · Protección extrema',
  'esenciales',
  'carro',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  21000,
  NULL,
  NULL,
  'img/cleaner.webp',
  'limpiador-electronico',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Limpiador Electrónico'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Limpiador Llantas LLantax',
  'Para Moto y Carros · Protección extrema',
  'esenciales',
  'all',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  30000,
  NULL,
  NULL,
  'img/limpiadorllantas.webp',
  'limpiador-llantas-llantax',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Limpiador Llantas LLantax'
  )
);

INSERT INTO products (
  name,
  description,
  category,
  vehicle,
  brand,
  viscosity,
  engine_type,
  api,
  jaso,
  presentation,
  price,
  price_min,
  price_max,
  image,
  slug,
  technical_data,
  active
)
SELECT
  'Pines',
  'Pregunta por los pines que necesites.',
  'esenciales',
  'all',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'img/pines.webp',
  'pines',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    'Pines'
  )
);