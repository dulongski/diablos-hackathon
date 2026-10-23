# Actualizar el dashboard publicado

Destino existente del equipo

https://claude.ai/artifact/1HXhuyBtkDd6szvLv9M7xo

El archivo `actualizacion_artifact.zip` contiene la compilación corregida, preparada para actualizar ese mismo Artifact. No crea otro enlace. La cuenta de Claude debe tener disponible la herramienta de publicación y una sesión con capacidad para ejecutarla. Esta preparación no actualizó la versión alojada.

## Contenido

- `artifact.html` es la entrada de contenido para el Artifact. Ya referencia los bundles nuevos.
- `assets/` contiene JavaScript y CSS compilados.
- `data/` contiene las trece tablas y modelos JSON que utiliza la app.
- `logos/` y `favicon.svg` son los recursos de marca.
- `index.html` permite desplegar la misma compilación como web estática.

Reemplaza la entrada del Artifact y los recursos con el mismo nombre. Añade todos los recursos del ZIP, conservando sus rutas relativas. No copies únicamente el HTML, porque depende del modelo y de las tablas JSON. Los bundles antiguos sin referencias pueden retirarse después de comprobar la publicación.

## Texto listo para la sesión de publicación

Actualiza mi Artifact Diablos Stuff+ existente en https://claude.ai/artifact/1HXhuyBtkDd6szvLv9M7xo usando el contenido de actualizacion_artifact.zip. Conserva exactamente ese enlace. Usa artifact.html como entrada y carga todos los recursos assets, data, logos y favicon con sus rutas relativas. No cambies el modelo ni recalcules análisis. Publica la compilación preparada y comprueba que Inicio muestre 7 de 561 lanzadores y una pérdida promedio de 9.3 puntos, y que Metodología tenga la auditoría con RMSE 0.267997 frente a 0.268111. El simulador a nivel del mar debe dar el mismo Stuff+ en ambos lados. No publiques datos crudos de la LMB.

Si la sesión de publicación está conectada a esta Mac, el ZIP está en `/private/tmp/diablos-entrega-20261022/entrega/actualizacion_artifact.zip`. Si la sesión está en la nube, descarga [el ZIP de main](https://raw.githubusercontent.com/dulongski/diablos-hackathon/refs/heads/main/entrega/actualizacion_artifact.zip), o adjunta ese mismo archivo si no hay acceso al repositorio. Lee primero el `CLAUDE.md` de `main`; la entrega corregida ya está integrada ahí. El envío final es por Google Forms, no por correo.

## Alternativa local

`dashboard.html` es una copia autónoma con código, logos y JSON incluidos. La compilación estática en `app/dist/` fue probada en navegador. La copia autónoma se verificó estructuralmente, pero el navegador de automatización bloquea abrir URLs file; no se afirma una prueba visual de esa modalidad. La publicación en Claude debe usar el paquete preparado, que conserva la estructura original del Artifact.

## Control de versión

Los hashes del paquete y de los documentos están en `manifest_entrega.json`. El modelo Stuff+, Location+ y Pitching+ conserva sus hashes anteriores. Las cifras transferidas a otro entorno, la interpretación y el bosque secundario sí se actualizaron.
