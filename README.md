# Trinity

Programá el sistema de autenticación de la bomba: la placa Arduino te manda un desafío y la única que sabe responderlo es una API.

**¡NO SE OLVIDEN DE ARMAR EL `.gitignore` para excluir todo lo que no quieren commitear!**
El proyecto ya trae uno: no lo borren. Veo un `node_modules` pusheado y se llevan la materia automáticamente.

---

## Consigna base

¡La carrera por la bomba está en marcha! Los Estados Unidos llevan a cabo el proyecto Manhattan, en donde las mentes más brillantes del mundo científico trabajan a contrarreloj para desarrollar la primera bomba atómica y derrotar a la Alemania nazi.

La primera detonación de prueba fue llamada Trinity. Te encomendaron hacer el sistema que autentica a quien intenta detenerla (o detonarla). Pero la bomba no acepta una contraseña fija: **te lanza un desafío distinto cada vez**, y la única que sabe resolverlo es la API del laboratorio de Los Álamos. Tu programa es el que está en el medio: lee el desafío de la placa, se lo pregunta a la API y le devuelve la respuesta a la placa.

Para practicar tenés placas de prueba que se comportan igual que la bomba, pero **te dejan intentar todas las veces que quieras**.

### Cómo habla la placa

La placa tiene un puerto serial que se conecta a la computadora por USB. El baudrate es de `115200`. Cada mensaje es **un objeto JSON en una línea** (termina con `\n`), tanto los que manda ella como los que le mandás vos. Para leer de a una línea por vez se usa un `ReadlineParser` (ya importado, junto con `SerialPort`); cada línea es un texto que tenés que convertir con `JSON.parse`.

| Quién | Mensaje | Qué significa |
|-------|---------|---------------|
| placa | `{"tipo":"disponible"}` | La placa está lista. Lo repite cada segundo hasta que le contestes. |
| vos | `{"dni":"2151"}` | Los últimos 4 dígitos de tu DNI, **como texto** (puede empezar con 0). |
| placa | `{"tipo":"desafio","nonce":483921}` | El desafío: un número distinto en cada intento. |
| vos | `{"respuesta":"0986d4ed"}` | La respuesta que te da la API. |
| placa | `{"tipo":"resultado","ok":true}` | Si la respuesta fue correcta o no. |
| placa | `{"tipo":"error","detalle":"..."}` | Algo salió mal (JSON inválido, sin intentos, etc.). |

### Cómo habla la API

`POST https://proyectos-tic.ort.edu.ar/trinity/api/respuesta`, con un JSON en el body:

```json
{ "dni": "2151", "nonce": 483921 }
```

Responde `{ "respuesta": "0986d4ed" }`. Si el `dni` no son 4 dígitos en texto o el `nonce` no es un número entero, responde con error `400`. Acordate de mandar el header `Content-Type: application/json`.

### Qué hay que hacer

1. Abrir el puerto de tu placa. El puerto lo ves en el Arduino IDE (Herramientas → Puerto) o en el Administrador de dispositivos (Puertos COM y LPT); se parece a `COM3`.
2. Leer los mensajes de la placa de a una línea por vez y convertirlos a `Mensaje`.
3. Cuando la placa avisa que está `disponible`, enviarle tu DNI.
4. Cuando manda el `desafio`, pedirle la respuesta a la API con `fetch` y enviársela a la placa.
5. Cuando manda el `resultado`, mostrar por consola si fue correcto (`true` o `false`) y cerrar el puerto.

También hay que completar tu DNI.

### Ejemplo

```
true
```

---

## La bomba real

Ahora sí: la bomba "real" que tenemos los profes. Es el mismo programa, apuntando al puerto de la bomba. La diferencia es que **tiene un solo intento**: si le mandás una respuesta incorrecta, no te deja volver a probar.

La actividad se considera hecha cuando se acercan a la mesa y logren desactivar la bomba. ¡Tienen un solo intento!

---

## ¿Qué hay que editar?

```
src/index.ts
```

La dirección de la API y el tipo `Mensaje` ya están completos y no hace falta tocarlos.

---

## Primeros pasos

Antes de poder correr el programa, hay que instalar las dependencias del proyecto (incluye la librería `serialport`). Esto se hace **una sola vez** con:

```bash
npm install
```

---

## Cómo correr el programa

Con la placa conectada por USB:

```bash
npm run start
```

---

## Tests

El proyecto incluye tests automáticos que se usan para la corrección:

```bash
npm test
```

No hace falta entenderlos ni modificarlos. Son para verificar que el programa funciona correctamente.
