# Configuración de DeepSeek R1 para Transcripción Médica

## 🚀 Configuración de la API Key

### 1. Obtener API Key de DeepSeek
1. Ve a [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Copia la API key

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con:

```env
# DeepSeek API Configuration
REACT_APP_DEEPSEEK_API_KEY=sk-86b8d2f019654ced9078e775d656dfcb
```

### 3. Reiniciar el Servidor de Desarrollo
```bash
npm run dev
```

## 🔧 Características del Modelo DeepSeek R1

### Especialización Médica
- **Modelo**: `deepseek-chat`
- **Temperatura**: 0.3 (para mayor consistencia clínica)
- **Max Tokens**: 1000
- **Enfoque**: Conversión de transcripciones a formato clínico profesional

### Formato de Salida
El modelo genera notas médicas estructuradas para "Padecimiento Actual" con:

1. **Inicio del padecimiento** con tiempo de evolución
2. **Síntomas principales** con características (localización, intensidad, calidad)
3. **Síntomas asociados**
4. **Factores agravantes y atenuantes**
5. **Antecedentes relevantes** al padecimiento actual

### Ejemplo de Conversión

**Entrada (Transcripción):**
"Doctor, vengo porque me duele mucho la cabeza desde hace tres días. El dolor está aquí en la frente y late mucho. También me dan náuseas y me molesta la luz. Cuando me muevo me duele más, pero si me acuesto en la oscuridad mejora un poco. Antes he tenido migrañas pero no tan fuertes como esta."

**Salida (Formato Clínico):**
"Paciente refiere inicio de cefalea hace 3 días, de localización frontal, carácter pulsátil, intensidad severa. Se acompaña de náuseas y fotofobia. Empeora con el movimiento y mejora parcialmente con el reposo en ambiente oscuro. Antecedente de migrañas previas de menor intensidad."

## 🔒 Seguridad

- La API key se maneja como variable de entorno
- No se almacena en el código fuente
- Comunicación encriptada con DeepSeek API
- Configuración `dangerouslyAllowBrowser: true` necesaria para uso en navegador

## 📝 Uso en la Aplicación

1. Ve a **Expediente del Paciente**
2. Haz clic en **Nueva Consulta**
3. En la sección **Padecimiento Actual**, haz clic en **Asistente IA**
4. Graba la conversación médico-paciente
5. Haz clic en **Generar con DeepSeek R1**
6. Revisa y aplica el texto formateado

## 🐛 Solución de Problemas

### Error: "API key de DeepSeek no configurada"
- Verifica que el archivo `.env` existe
- Verifica que la variable `REACT_APP_DEEPSEEK_API_KEY` está configurada
- Reinicia el servidor de desarrollo

### Error de conexión con DeepSeek
- Verifica tu conexión a internet
- Verifica que la API key es válida
- Revisa la consola del navegador para más detalles

## 💡 Ventajas del DeepSeek R1

1. **Especialización**: Optimizado para texto médico
2. **Consistencia**: Menor variabilidad en respuestas
3. **Eficiencia**: Procesamiento rápido de transcripciones
4. **Precisión**: Terminología médica apropiada
5. **Estructura**: Formato clínico estándar