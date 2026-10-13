const fs = require("fs");

const html = fs.readFileSync(
  "./productos2.html",
  "utf8"
);


/* =====================================================
   BUSCAR CADA PRODUCTO INDIVIDUALMENTE
===================================================== */

const productMatches = [
  ...html.matchAll(
    /data-product="([^"]+)"/g
  )
];


console.log(
  `🔎 data-product encontrados: ${productMatches.length}`
);


if (productMatches.length !== 49) {

  console.error(
    "❌ No se encontraron exactamente 50 productos."
  );

  process.exit(1);

}


/* =====================================================
   EXTRAER TARJETAS
===================================================== */

const products = [];


productMatches.forEach(
  (match, index) => {

    const name =
      match[1];


    const productPosition =
      match.index;


    /*
      Buscar el <article que contiene
      este data-product.
    */

    const articleStart =
      html.lastIndexOf(
        "<article",
        productPosition
      );


    /*
      Buscar el cierre de la tarjeta.
    */

    const articleEnd =
      html.indexOf(
        "</article>",
        productPosition
      );


    if (
      articleStart === -1 ||
      articleEnd === -1
    ) {

      console.error(
        `❌ No se pudo extraer: ${name}`
      );

      return;

    }


    const card =
      html.slice(
        articleStart,
        articleEnd +
          "</article>".length
      );


    /* =================================================
       DATOS
    ================================================= */

    const vehicle =
      card.match(
        /data-vehicle="([^"]*)"/
      )?.[1] || "";


    const category =
      card.match(
        /data-category="([^"]*)"/
      )?.[1] || "";


    const price =
      card.match(
        /data-price="([^"]*)"/
      )?.[1] || "0";


    const image =
      card.match(
        /<img[\s\S]*?src="([^"]*)"/
      )?.[1] || "";


    const description =
      card.match(
        /<p[^>]*>([\s\S]*?)<\/p>/
      )?.[1]
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim() || "";


    products.push({

      name,

      description,

      category,

      vehicle,

      price:
        Number(price) || 0,

      image

    });

  }
);


/* =====================================================
   COMPROBAR RESULTADO
===================================================== */

console.log(
  `📦 Productos extraídos: ${products.length}`
);


if (products.length !== 49) {

  console.error(
    "❌ Todavía falta una tarjeta."
  );


  console.log(
    "\nProductos encontrados:\n"
  );


  products.forEach(
    (product, index) => {

      console.log(
        `${index + 1}. ${product.name}`
      );

    }
  );


  process.exit(1);

}


/* =====================================================
   ESCAPAR SQL
===================================================== */

function escapeSQL(value) {

  return String(value ?? "")
    .replace(/'/g, "''");

}


/* =====================================================
   CREAR SLUG
===================================================== */

function createSlug(name) {

  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      "");

}


/* =====================================================
   GENERAR SQL
===================================================== */

const sql =
  products
    .map(product => {

      return `
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
  '${escapeSQL(product.name)}',
  '${escapeSQL(product.description)}',
  '${escapeSQL(product.category)}',
  '${escapeSQL(product.vehicle)}',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  ${product.price},
  NULL,
  NULL,
  '${escapeSQL(product.image)}',
  '${escapeSQL(createSlug(product.name))}',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM products
  WHERE LOWER(name) = LOWER(
    '${escapeSQL(product.name)}'
  )
);
`.trim();

    })
    .join("\n\n");


/* =====================================================
   GUARDAR SQL
===================================================== */

fs.writeFileSync(
  "./migrar-productos.sql",
  sql,
  "utf8"
);


console.log(
  "========================================"
);

console.log(
  "✅ MIGRACIÓN PREPARADA"
);

console.log(
  `📦 ${products.length} productos preparados`
);

console.log(
  "📄 migrar-productos.sql creado"
);

console.log(
  "========================================"
);

console.log(
  "⚠️ TODAVÍA NO EJECUTES EL SQL"
);