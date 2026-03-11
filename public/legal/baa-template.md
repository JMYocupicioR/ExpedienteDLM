# Business Associate Agreement (BAA) — Template
# Acuerdo de Asociado de Negocio — ExpedienteDLM

**HIPAA Compliance — Protected Health Information (PHI)**

**Fecha de vigencia:** [FECHA]

---

## Partes

**Entidad Cubierta ("Cubierta"):**
- Nombre: [NOMBRE DE LA CLÍNICA / HOSPITAL]
- Dirección: [DIRECCIÓN]
- Representante: [NOMBRE DEL REPRESENTANTE]

**Asociado de Negocio ("Asociado"):**
- Nombre: DeepLux.org — ExpedienteDLM
- Dirección: [DIRECCIÓN]
- Representante: [NOMBRE DEL REPRESENTANTE]

---

## 1. Definiciones

- **PHI** (Protected Health Information): Información de Salud Protegida según HIPAA
- **ePHI**: PHI en formato electrónico
- **Brecha de Seguridad**: Cualquier acceso, uso o divulgación no autorizado de PHI

## 2. Obligaciones del Asociado de Negocio

El Asociado se compromete a:

### 2.1 Salvaguardas
- Implementar salvaguardas administrativas, físicas y técnicas apropiadas
- Encriptar toda ePHI en reposo (AES-256) y en tránsito (TLS 1.2+)
- Mantener controles de acceso basados en roles (RBAC)
- Exigir MFA para todos los usuarios con acceso a ePHI
- Mantener registros de auditoría inmutables

### 2.2 Uso y Divulgación
- Utilizar PHI únicamente para los fines establecidos en este acuerdo
- No divulgar PHI a terceros excepto cuando sea permitido o requerido por ley
- Limitar el acceso a PHI al mínimo necesario

### 2.3 Notificación de Brechas
- Notificar a la Entidad Cubierta dentro de **24 horas** de descubrir una brecha
- Proporcionar detalles de la brecha: datos afectados, usuarios impactados, acciones correctivas
- Cooperar en la investigación y mitigación

### 2.4 Retención y Disposición
- Retener registros de auditoría por un mínimo de **6 años**
- Al terminar el acuerdo, devolver o destruir toda PHI de forma segura
- Certificar por escrito la destrucción de PHI

## 3. Obligaciones de la Entidad Cubierta

La Entidad Cubierta se compromete a:
- Obtener consentimiento apropiado de pacientes para uso de la plataforma
- Notificar al Asociado de cualquier restricción en el uso de PHI
- No solicitar uso de PHI que viole HIPAA

## 4. Subcontratistas

El Asociado puede subcontratar servicios que involucren PHI solo si:
- Establece un acuerdo BAA equivalente con el subcontratista
- Notifica a la Entidad Cubierta de dichos subcontratistas

### Subcontratistas Actuales:
| Proveedor | Servicio | Ubicación de Datos |
|---|---|---|
| Supabase (AWS) | Base de datos y autenticación | [REGIÓN] |
| Netlify | Hosting de aplicación web | [REGIÓN] |

## 5. Término y Terminación

- Este acuerdo es vigente mientras exista la relación de servicio
- Cualquier parte puede terminar con **30 días** de aviso por escrito
- Las obligaciones de confidencialidad sobreviven a la terminación

## 6. Remedios

En caso de violación material:
1. La parte afectada notificará por escrito
2. La parte en incumplimiento tiene **30 días** para remediar
3. Si no se remedia, la parte afectada puede terminar el acuerdo
4. Para brechas de seguridad, la terminación puede ser inmediata

## 7. Ley Aplicable

Este acuerdo se rige por HIPAA (45 CFR §§ 160, 164) y las leyes de los Estados Unidos Mexicanos.

---

**ENTIDAD CUBIERTA:**

Firma: _________________________ Fecha: _____________
Nombre: [NOMBRE]
Cargo: [CARGO]

**ASOCIADO DE NEGOCIO (ExpedienteDLM):**

Firma: _________________________ Fecha: _____________
Nombre: [NOMBRE]
Cargo: [CARGO]

---

> ⚠️ **NOTA IMPORTANTE:** Este template es una referencia inicial y DEBE ser revisado por un abogado especialista en HIPAA y legislación de datos de salud antes de su utilización.
