# Catálogo web La Minga · Bonsai

Catálogo estático, gratuito y pensado para celulares. Incluye:

- 133 productos de la lista de precios 2026.
- Buscador y filtro por categorías.
- Carrito persistente en el teléfono.
- Control de cantidades y subtotal.
- Validación de compra mínima de $500.
- Formulario de entrega y pago.
- Pedido preparado para enviar por WhatsApp.
- Botón para copiar el pedido.
- Instalación como app web y funcionamiento offline después de la primera visita.

## Publicarlo gratis en GitHub Pages

1. Crear una cuenta en GitHub.
2. Crear un repositorio nuevo, por ejemplo `catalogo-la-minga`.
3. Subir todos los archivos de esta carpeta.
4. Entrar en **Settings → Pages**.
5. En **Build and deployment**, elegir **Deploy from a branch**.
6. Seleccionar la rama `main` y la carpeta `/root`.
7. Guardar. GitHub mostrará la dirección pública.

## Probarlo en una computadora

No conviene abrir `index.html` directamente porque algunas funciones de instalación/offline necesitan un servidor local.

Desde esta carpeta ejecutar:

```bash
python -m http.server 8000
```

Luego abrir en el navegador:

```text
http://localhost:8000
```

## Cambiar teléfono, compra mínima o textos

Editar `config.js`.

El WhatsApp está configurado como:

```text
59899370519
```

Formato usado: código de Uruguay `598` + número sin el cero inicial.

## Cambiar productos y precios

Editar `productos.js`. Cada producto tiene esta estructura:

```js
{
  "id": 1,
  "categoria": "Artículos de limpieza",
  "nombre": "Fibra esponja 3x2",
  "precio": 100,
  "novedad": false
}
```

Después de cambios importantes, cambiar en `sw.js`:

```js
const CACHE = "la-minga-catalogo-v2";
```

Esto obliga a los celulares a descargar la versión nueva.

## Importante

La página no envía mensajes automáticamente. Abre WhatsApp con el pedido completo y el cliente confirma tocando **Enviar**. No requiere servidor, base de datos ni pagos mensuales.


## Vista previa al compartir por WhatsApp

El sitio incluye `og-catalogo.png` y etiquetas Open Graph en `index.html`.

Para actualizar esta versión en GitHub:

1. Reemplazar `index.html`.
2. Reemplazar `sw.js`.
3. Subir `og-catalogo.png`.
4. Esperar unos minutos y volver a compartir el enlace.

WhatsApp puede conservar una vista previa anterior en caché. En ese caso, probá compartir temporalmente:

```text
https://lacroxruy.github.io/catalogo-la-minga/?v=2
```

El parámetro no cambia la página; solo ayuda a forzar una nueva lectura de la vista previa.
