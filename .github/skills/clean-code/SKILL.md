---
name: clean-code
description: 'Refactoriza código para hacerlo más limpio, corto y eficiente sin cambiar funcionalidad observable. Elimina redundancias, simplifica estructuras y aplica buenas prácticas modernas de JavaScript.'
---

# Clean Code

Refactoriza código asegurando que el comportamiento observable se mantenga EXACTAMENTE igual.

## ⚠️ Reglas críticas (NO romper esto)

- NO cambiar funcionalidad bajo ninguna circunstancia
- NO cambiar nombres públicos (exports, funciones, variables usadas externamente)
- NO cambiar estructura de datos externa
- NO introducir bugs por simplificación
- NO hacer el código más corto si pierde legibilidad

---

## 🧠 Qué hacer

- Reducir líneas innecesarias
- Eliminar duplicación
- Simplificar lógica compleja
- Usar sintaxis moderna:
  - arrow functions
  - destructuring
  - template literals
- Eliminar:
  - console.log innecesarios
  - variables no usadas
  - imports no usados
  - código muerto

---

## 🔍 Cómo pensar (esto mejora MUCHO a Copilot)

Antes de refactorizar:

1. Entender qué hace el código
2. Detectar riesgos de romper funcionalidad
3. Identificar partes redundantes o innecesarias

Luego:

- Aplicar cambios pequeños y seguros
- Priorizar claridad sobre reducción extrema
- Evitar sobre-optimización

---

## 🛠️ Estrategias permitidas

- Reemplazar:
  - `function` → arrow function (solo si no usa `this`)
  - `if` simple → ternario (solo si es claro)
- Usar early returns en vez de if anidados
- Extraer funciones SOLO si mejora legibilidad
- Reducir variables intermedias innecesarias

---

## 🚫 Qué NO hacer

- No hacer “code golf” (código ilegible por ser corto)
- No cambiar lógica en edge cases
- No reestructurar todo el archivo sin necesidad
- No introducir nuevas dependencias

---

## 📤 Output obligatorio

Siempre responder con:

1. ✅ Código refactorizado
2. 🧾 Lista breve de mejoras aplicadas
3. 🔒 Confirmación de que la funcionalidad se mantiene
4. ⚠️ Riesgos o limitaciones (si existen)

---

## 🧪 Validación

- Si hay tests → asumir que deben pasar
- Si no hay tests → verificar mentalmente:
  - inputs → outputs
  - casos edge
  - flujo principal

---

## 🧠 Modo experto (actívalo automáticamente)

- Detectar lógica duplicada y sugerir reutilización
- Reducir complejidad ciclomática
- Mejorar nombres internos si no rompe API
- Optimizar pequeñas ineficiencias

---

## 📌 Ejemplo

Input:

```js
function suma(a, b) {
  let resultado = a + b;
  return resultado;
}
```
