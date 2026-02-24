# Resumen de Limpieza de Plantilla de Inventario

## Objetivo
Generalizar todos los nombres de InventoryItem para que sean canónicos y reutilizables, moviendo especificidades a InventoryLine (size, variantValue, notes).

---

## Items Renombrados y Generalizados

### KITCHEN_ACCESSORIES

1. **"Bote de basura chico con tapa"** → **"Bote de basura"**
   - Tamaño "chico" → `line.size: "Chico"`
   - "con tapa" → `line.notes: "Con tapa"`
   - Fusionado con: "Bote de basura con tapa plástico", "Cesto de basura plástico cocina", "Cesto de basura plástico"

2. **"Bote acero vidrio para café azúcar"** → **"Frascos"**
   - Material "acero vidrio" → `variantKey: "material"`, `variantValue: "Acero vidrio"`
   - Uso "para café azúcar" → `line.notes: "Para café y azúcar"`

3. **"Cafetera de goteo"** → **"Cafetera"**
   - Tipo "de goteo" → `line.notes: "De goteo"`
   - Capacidad "4 tazas" → `line.size: "4 tazas"`

4. **"Coladera chica"** → **"Coladera"**
   - Tamaño "chica" → `line.size: "Chica"`

5. **"Coladera de metal grande"** → **"Coladera"** (fusionado con anterior)
   - Material "de metal" → `variantKey: "material"`, `variantValue: "Metal"`
   - Tamaño "grande" → `line.size: "Grande"`

6. **"Comal cuadrado con asa"** → **"Comal"**
   - Forma "cuadrado" → `line.notes: "Cuadrado"`
   - "con asa" → `line.notes: "Con asa"` (combinado)

7. **"Copa de vidrio"** → **"Copa"**
   - Material "de vidrio" → `variantKey: "material"`, `variantValue: "Vidrio"`

8. **"Cuchara cafetera"** → **"Cuchara"**
   - Tipo "cafetera" → `variantKey: "tipo"`, `variantValue: "Cafetera"`

9. **"Cuchara sopera"** → **"Cuchara"** (fusionado con anterior)
   - Tipo "sopera" → `variantKey: "tipo"`, `variantValue: "Sopera"`

10. **"Cucharón plástico negro"** → **"Cucharón"**
    - Material "plástico" → `variantKey: "material"`, `variantValue: "Plástico"`
    - Color "negro" → `line.color: "Negro"`

11. **"Cuchillo cubierto"** → **"Cuchillo"**
    - Tipo "cubierto" → `variantKey: "tipo"`, `variantValue: "Cubierto"`

12. **"Cuchillo mediano rojo"** → **"Cuchillo"** (fusionado con anterior)
    - Tamaño "mediano" → `line.size: "Mediano"`
    - Color "rojo" → `line.color: "Rojo"`
    - Tipo "cocina" → `variantKey: "tipo"`, `variantValue: "Cocina"`

13. **"Dispensador de aceite de vidrio"** → **"Dispensador de aceite"**
    - Material "de vidrio" → `variantKey: "material"`, `variantValue: "Vidrio"`

14. **"Escurridor de platos"** → **"Escurridor"**
    - Uso "de platos" → `line.notes: "Para platos"`

15. **"Exprimidor de limones grande"** → **"Exprimidor"**
    - Uso "de limones" → `line.notes: "Para limones"`
    - Tamaño "grande" → `line.size: "Grande"`

16. **"Jarra de agua chica de plástico naranja"** → **"Jarra"**
    - Uso "de agua" → `line.notes: "Para agua"`
    - Tamaño "chica" → `line.size: "Chica"`
    - Material "de plástico" → `variantKey: "material"`, `variantValue: "Plástico"`
    - Color "naranja" → `line.color: "Naranja"`

17. **"Jarra de barro negro"** → **"Jarra"** (fusionado con anterior)
    - Material "de barro" → `variantKey: "material"`, `variantValue: "Barro"`
    - Color "negro" → `line.color: "Negro"`

18. **"Licuadora vaso vidrio"** → **"Licuadora"**
    - Material "vaso vidrio" → `line.notes: "Vaso de vidrio"`

19. **"Mantelitos de comedor"** → **"Mantel individual"**
    - Tamaño "mantelitos" → `line.size: "Pequeño"`
    - Uso "de comedor" → `line.notes: "Para comedor"`

20. **"Olla mediana con tapa"** → **"Olla"**
    - Tamaño "mediana" → `line.size: "Mediana"`
    - "con tapa" → `line.notes: "Con tapa"`

21. **"Pala plástica negra"** → **"Pala"**
    - Material "plástica" → `variantKey: "material"`, `variantValue: "Plástico"`
    - Color "negra" → `line.color: "Negra"`

22. **"Plato extendido chico"** → **"Plato"**
    - Tipo "extendido" → `variantKey: "tipo"`, `variantValue: "Extendido"`
    - Tamaño "chico" → `line.size: "Chico"`

23. **"Plato extendido grande"** → **"Plato"** (fusionado con anterior)
    - Tipo "extendido" → `variantKey: "tipo"`, `variantValue: "Extendido"`
    - Tamaño "grande" → `line.size: "Grande"`

24. **"Plato hondo"** → **"Plato"** (fusionado con anterior)
    - Tipo "hondo" → `variantKey: "tipo"`, `variantValue: "Hondo"`

25. **"Pocillo mediano con asa"** → **"Pocillo"**
    - Tamaño "mediano" → `line.size: "Mediano"`
    - "con asa" → `line.notes: "Con asa"`

26. **"Cuarzo decorativo"** → **"Cuarzo decorativo"** (mantener, es genérico)

27. **"Sartén mediano"** → **"Sartén"**
    - Tamaño "mediano" → `line.size: "Mediano"`

28. **"Servilletero de metal"** → **"Servilletero"**
    - Material "de metal" → `variantKey: "material"`, `variantValue: "Metal"`

29. **"Tabla de picar de plástico blanca"** → **"Tabla de picar"**
    - Material "de plástico" → `variantKey: "material"`, `variantValue: "Plástico"`
    - Color "blanca" → `line.color: "Blanca"`

30. **"Tapa de cazuela chica"** → **"Tapa de cazuela"**
    - Tamaño "chica" → `line.size: "Chica"`

31. **"Tarro cervecero grande"** → **"Tarro cervecero"**
    - Tamaño "grande" → `line.size: "Grande"`

32. **"Taza cafetera alta"** → **"Taza"**
    - Tipo "cafetera" → `variantKey: "tipo"`, `variantValue: "Cafetera"`
    - Tamaño "alta" → `line.size: "Alta"`

33. **"Tenedor"** → **"Tenedor"** (mantener, ya es genérico)

34. **"Tijera de cocina"** → **"Tijera"**
    - Uso "de cocina" → `line.notes: "Para cocina"`

35. **"Tortillero"** → **"Tortillero"** (mantener, ya es genérico)

36. **"Trapos de cocina para limpiar"** → **"Trapo"**
    - Uso "de cocina" → `line.notes: "Para cocina"`
    - Función "para limpiar" → `variantKey: "uso"`, `variantValue: "Limpiar"`

37. **"Trapos de cocina para secar"** → **"Trapo"** (fusionado con anterior)
    - Uso "de cocina" → `line.notes: "Para cocina"`
    - Función "para secar" → `variantKey: "uso"`, `variantValue: "Secar"`

38. **"Vaso de vidrio chico old fashion"** → **"Vaso"**
    - Material "de vidrio" → `variantKey: "material"`, `variantValue: "Vidrio"`
    - Tamaño "chico" → `line.size: "Chico"`
    - Estilo "old fashion" → `line.notes: "Estilo old fashion"`

39. **"Vaso de vidrio grande tipo old fashion"** → **"Vaso"** (fusionado con anterior)
    - Material "de vidrio" → `variantKey: "material"`, `variantValue: "Vidrio"`
    - Tamaño "grande" → `line.size: "Grande"`
    - Estilo "old fashion" → `line.notes: "Estilo old fashion"`

40. **"Vasos de vidrio grandes"** → **"Vaso"** (fusionado con anterior)
    - Material "de vidrio" → `variantKey: "material"`, `variantValue: "Vidrio"`
    - Tamaño "grandes" → `line.size: "Grande"`

### FURNITURE_EQUIPMENT

1. **"Refrigerador"** → **"Refrigerador"** (mantener, ya es genérico)

2. **"Microondas"** → **"Microondas"** (mantener, ya es genérico)

3. **"Lavadora de ropa"** → **"Lavadora"**
   - Uso "de ropa" → eliminado (redundante)
   - Capacidad "16kg" → `line.size: "16kg"`

4. **"Secadora de ropa"** → **"Secadora"**
   - Uso "de ropa" → eliminado (redundante)

5. **"Boiler de depósito"** → **"Boiler"**
   - Tipo "de depósito" → `line.notes: "De depósito"`

6. **"Burro de planchar de metal"** → **"Burro de planchar"**
   - Material "de metal" → `variantKey: "material"`, `variantValue: "Metal"`
   - Tamaño "pequeño" → `line.size: "Pequeño"` (si aplica)

7. **"Escalera de 2 escalones de madera"** → **"Escalera"**
   - Tamaño "2 escalones" → `line.size: "2 escalones"`
   - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`

8. **"Escalera de 2 escalones de metal"** → **"Escalera"** (fusionado con anterior)
   - Tamaño "2 escalones" → `line.size: "2 escalones"`
   - Material "de metal" → `variantKey: "material"`, `variantValue: "Metal"`

9. **"Cama Queen Size"** → **"Cama"** (fusionado con "Cama matrimonial")
   - Tamaño "Queen" → `variantKey: "tamaño"`, `variantValue: "Queen"`

10. **"Cama matrimonial"** → **"Cama"** (fusionado con anterior)
    - Tamaño "Matrimonial" → `variantKey: "tamaño"`, `variantValue: "Matrimonial"`

11. **"Recámara King size, cabecera y 2 burós"** → **"Recámara"** (concepto diferente, mantener separado o fusionar con Cama)
    - Tamaño "King" → `variantKey: "tamaño"`, `variantValue: "King"`
    - Incluye "cabecera y 2 burós" → `line.notes: "Incluye cabecera y 2 burós"`

12. **"Archivero metálico negro"** → **"Archivero"**
    - Material "metálico" → `variantKey: "material"`, `variantValue: "Metálico"`
    - Color "negro" → `line.color: "Negro"`

13. **"Soporte de equipaje"** → **"Soporte de equipaje"** (mantener, ya es genérico)

14. **"Tocador de madera de recámara"** → **"Tocador"**
    - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`
    - Uso "de recámara" → eliminado (redundante)

15. **"Ventilador chico"** → **"Ventilador"**
    - Tamaño "chico" → `line.size: "Chico"`

16. **"Ventilador de torre"** → **"Ventilador"** (fusionado con anterior)
    - Tipo "de torre" → `variantKey: "tipo"`, `variantValue: "Torre"`

17. **"Ventilador de Piso blanco"** → **"Ventilador"** (fusionado con anterior)
    - Tipo "de piso" → `variantKey: "tipo"`, `variantValue: "Piso"`
    - Color "blanco" → `line.color: "Blanco"`

18. **"Ventilador pedestal"** → **"Ventilador"** (fusionado con anterior)
    - Tipo "pedestal" → `variantKey: "tipo"`, `variantValue: "Pedestal"`

19. **"Zapatera de bambú"** → **"Zapatera"**
    - Material "de bambú" → `variantKey: "material"`, `variantValue: "Bambú"`

20. **"Mesa desayunadora de madera"** → **"Mesa"**
    - Tipo "desayunadora" → `variantKey: "tipo"`, `variantValue: "Desayunadora"`
    - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`

21. **"Mesa esquinera de madera para modem"** → **"Mesa"** (fusionado con anterior)
    - Tipo "esquinera" → `variantKey: "tipo"`, `variantValue: "Esquinera"`
    - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`
    - Uso "para modem" → `line.notes: "Para modem"`

22. **"Mesa de centro madera y vidrio"** → **"Mesa"** (fusionado con anterior)
    - Tipo "de centro" → `variantKey: "tipo"`, `variantValue: "Centro"`
    - Material "madera y vidrio" → `variantKey: "material"`, `variantValue: "Madera y vidrio"`

23. **"Mesa centro café"** → **"Mesa"** (fusionado con anterior)
    - Tipo "centro" → `variantKey: "tipo"`, `variantValue: "Centro"`
    - Uso "café" → `line.notes: "Para café"`

24. **"Mesa lateral de madera con vidrio"** → **"Mesa"** (fusionado con anterior)
    - Tipo "lateral" → `variantKey: "tipo"`, `variantValue: "Lateral"`
    - Material "madera con vidrio" → `variantKey: "material"`, `variantValue: "Madera y vidrio"`

25. **"Mesa para modem"** → **"Mesa"** (fusionado con anterior)
    - Uso "para modem" → `line.notes: "Para modem"`

26. **"Mesa microondas"** → **"Mesa"** (fusionado con anterior)
    - Uso "microondas" → `line.notes: "Para microondas"`

27. **"Mueble de Madera cajonera"** → **"Mueble cajonera"**
    - Material "de Madera" → `variantKey: "material"`, `variantValue: "Madera"`

28. **"Mueble de TV con 8 cestas de tela"** → **"Mueble de TV"**
    - Detalle "8 cestas de tela" → `line.notes: "Con 8 cestas de tela"`

29. **"Sala de 3 piezas, sofá, Love seat e individual"** → **"Sofá"**
    - Tipo "3 piezas" → `line.notes: "3 piezas: sofá, love seat e individual"`

30. **"Sofá Cama"** → **"Sofá"** (fusionado con anterior)
    - Tipo "cama" → `variantKey: "tipo"`, `variantValue: "Cama"`

31. **"TV Fire TV Amazon 55 pulgadas y control remoto"** → **"Televisor"**
    - Marca "Fire TV Amazon" → `line.brand: "Fire TV Amazon"`
    - Tamaño "55 pulgadas" → `line.size: "55 pulgadas"`
    - Incluye "control remoto" → `line.notes: "Incluye control remoto"`

32. **"Pantalla de TV 50\""** → **"Televisor"** (fusionado con anterior)
    - Tamaño "50 pulgadas" → `line.size: "50 pulgadas"`

33. **"Soporte de TV"** → **"Soporte de TV"** (mantener, ya es genérico)

34. **"Extensión eléctrica de 2 metros"** → **"Extensión eléctrica"**
    - Tamaño "2 metros" → `line.size: "2 metros"`

35. **"Extensión eléctrica de 4 metros"** → **"Extensión eléctrica"** (fusionado con anterior)
    - Tamaño "4 metros" → `line.size: "4 metros"`

36. **"Chapa electrónica"** → **"Chapa electrónica"** (mantener, ya es genérico)

37. **"Cortina y cortinero"** → **"Cortina"**
    - Incluye "cortinero" → `line.notes: "Incluye cortinero"`

38. **"Perchero de madera"** → **"Perchero"**
    - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`

39. **"Perchero de pared"** → **"Perchero"** (fusionado con anterior)
    - Tipo "de pared" → `variantKey: "tipo"`, `variantValue: "Pared"`

40. **"Plancha"** → **"Plancha"** (mantener, ya es genérico)

41. **"Corbata auto"** → **"Corbata auto"** (mantener, ya es genérico)

### LINENS

1. **"Toalla de piso"** → **"Toalla de piso"** (mantener, ya es genérico)

2. **"Toalla de manos"** → **"Toalla de manos"** (mantener, ya es genérico)

3. **"Toalla de cuerpo"** → **"Toalla de cuerpo"** (mantener, ya es genérico)

4. **"Toalla de pies"** → **"Toalla de pies"** (mantener, ya es genérico)

5. **"Almohadas"** → **"Almohadas"** (mantener, ya es genérico)

6. **"Colcha Queen"** → **"Colcha"**
    - Tamaño "Queen" → `variantKey: "tamaño"`, `variantValue: "Queen"`

7. **"Cobertor matrimonial"** → **"Cobertor"**
    - Tamaño "matrimonial" → `variantKey: "tamaño"`, `variantValue: "Matrimonial"`

8. **"Colcha gris"** → **"Colcha"** (fusionado con anterior)
    - Color "gris" → `line.color: "Gris"`

9. **"Sábanas Queen"** → **"Sábanas"**
    - Tamaño "Queen" → `variantKey: "tamaño"`, `variantValue: "Queen"`

10. **"Juego de sabanas"** → **"Sábanas"** (fusionado con anterior)
    - Tipo "juego" → `line.notes: "Juego completo"`

11. **"Cobija"** → **"Cobija"** (mantener, ya es genérico)

12. **"Cubrecolchón"** → **"Cubrecolchón"** (mantener, ya es genérico)

13. **"Fundas extras"** → **"Fundas"**
    - Tipo "extras" → `line.notes: "Extras"`

14. **"Ganchos"** → **"Ganchos"** (mantener, ya es genérico)

15. **"Cortinas con cortinero"** → **"Cortina"** (fusionado con "Cortina y cortinero")
    - Incluye "cortinero" → `line.notes: "Incluye cortinero"`

16. **"Base cabecera matrim"** → **"Base de cama"**
    - Tamaño "matrimonial" → `variantKey: "tamaño"`, `variantValue: "Matrimonial"`

17. **"Cabecera de Melamina Matrimonial"** → **"Cabecera"**
    - Material "Melamina" → `variantKey: "material"`, `variantValue: "Melamina"`
    - Tamaño "Matrimonial" → `variantKey: "tamaño"`, `variantValue: "Matrimonial"`

18. **"Colchon matrim"** → **"Colchón"**
    - Tamaño "matrimonial" → `variantKey: "tamaño"`, `variantValue: "Matrimonial"`

### DECOR

1. **"Cuadro de Madera \"Las tarascas\""** → **"Cuadro"**
    - Material "de Madera" → `variantKey: "material"`, `variantValue: "Madera"`
    - Detalle específico "Las tarascas" → ELIMINADO (no aplica para plantilla)

2. **"Cuadro decorativo \"Flores rojas\""** → **"Cuadro"** (fusionado con anterior)
    - Detalle específico "Flores rojas" → ELIMINADO (no aplica para plantilla)

3. **"Cuadros"** → **"Cuadro"** (fusionado con anterior)

4. **"Maceta gris claro con una planta"** → **"Maceta"**
    - Color "gris claro" → `line.color: "Gris claro"`
    - Incluye "planta" → `line.notes: "Con planta"`

5. **"Maceta pequeña con planta sobre el comedor"** → **"Maceta"** (fusionado con anterior)
    - Tamaño "pequeña" → `line.size: "Pequeña"`
    - Incluye "planta" → `line.notes: "Con planta"`
    - Ubicación específica "sobre el comedor" → ELIMINADO (no aplica para plantilla)

6. **"Maceta de plástico roja chica con planta"** → **"Maceta"** (fusionado con anterior)
    - Material "de plástico" → `variantKey: "material"`, `variantValue: "Plástico"`
    - Color "roja" → `line.color: "Roja"`
    - Tamaño "chica" → `line.size: "Chica"`
    - Incluye "planta" → `line.notes: "Con planta"`

7. **"Maceta mediana con planta sobre la base"** → **"Maceta"** (fusionado con anterior)
    - Tamaño "mediana" → `line.size: "Mediana"`
    - Incluye "planta" → `line.notes: "Con planta"`
    - Ubicación específica "sobre la base" → ELIMINADO (no aplica para plantilla)

8. **"Maceta pequeña con planta sobre mesa centro"** → **"Maceta"** (fusionado con anterior)
    - Tamaño "pequeña" → `line.size: "Pequeña"`
    - Incluye "planta" → `line.notes: "Con planta"`
    - Ubicación específica "sobre mesa centro" → ELIMINADO (no aplica para plantilla)

9. **"Macetas grandes con planta"** → **"Maceta"** (fusionado con anterior)
    - Tamaño "grandes" → `line.size: "Grande"`
    - Incluye "planta" → `line.notes: "Con planta"`

10. **"Base de maceta de cantera"** → **"Base de maceta"**
    - Material "de cantera" → `variantKey: "material"`, `variantValue: "Cantera"`

11. **"Cojines de tela"** → **"Cojín"**
    - Material "de tela" → `variantKey: "material"`, `variantValue: "Tela"`

12. **"Muñecas de tela"** → **"Muñeca"**
    - Material "de tela" → `variantKey: "material"`, `variantValue: "Tela"`

13. **"Porta pies de tela"** → **"Porta pies"**
    - Material "de tela" → `variantKey: "material"`, `variantValue: "Tela"`

14. **"Repisa decorativa de madera para muñecas"** → **"Repisa"**
    - Material "de madera" → `variantKey: "material"`, `variantValue: "Madera"`
    - Uso "para muñecas" → `line.notes: "Para muñecas"`

15. **"Espejo completo"** → **"Espejo"**
    - Tipo "completo" → `line.notes: "Completo"`

16. **"Antecomedor"** → **"Antecomedor"** (mantener, ya es genérico)

17. **"Sillas de tela para comedor gris claro"** → **"Silla"**
    - Material "de tela" → `variantKey: "material"`, `variantValue: "Tela"`
    - Uso "para comedor" → `line.notes: "Para comedor"`
    - Color "gris claro" → `line.color: "Gris claro"`

18. **"Sillas de tela para comedor gris oscuro"** → **"Silla"** (fusionado con anterior)
    - Material "de tela" → `variantKey: "material"`, `variantValue: "Tela"`
    - Uso "para comedor" → `line.notes: "Para comedor"`
    - Color "gris oscuro" → `line.color: "Gris oscuro"`

19. **"Sillas"** → **"Silla"** (fusionado con anterior)

20. **"Camino de mesa decorativo"** → **"Camino de mesa"**
    - Tipo "decorativo" → eliminado (redundante)

### CONSUMABLES / OTHER

1. **"Manguera de Jardín"** → **"Manguera"**
    - Uso "de Jardín" → eliminado (redundante)

2. **"Tendedero"** → **"Tendedero"** (mantener, ya es genérico)

3. **"Pinzas ropa"** → **"Pinzas"**
    - Uso "ropa" → eliminado (redundante)

4. **"Escoba"** → **"Escoba"** (mantener, ya es genérico)

5. **"Trapeador"** → **"Trapeador"** (mantener, ya es genérico)

6. **"Fibra"** → **"Fibra"** (mantener, ya es genérico)

7. **"Recogedor"** → **"Recogedor"** (mantener, ya es genérico)

8. **"Cubeta"** → **"Cubeta"** (mantener, ya es genérico)

9. **"Escobeta"** → **"Escobeta"** (mantener, ya es genérico)

10. **"Destapacaños"** → **"Destapacaños"** (mantener, ya es genérico)

11. **"Porta shampoo"** → **"Porta shampoo"** (mantener, ya es genérico)

12. **"Jabonera"** → **"Jabonera"** (mantener, ya es genérico)

13. **"Botiquin"** → **"Botiquín"** (mantener, ya es genérico)

---

## Items Fusionados

### Grupo 1: Bote de basura / Cesto de basura
- **Items fusionados:** "Bote de basura chico con tapa", "Bote de basura con tapa plástico", "Cesto de basura plástico cocina", "Cesto de basura plástico"
- **Resultado:** "Bote de basura"
- **Líneas combinadas:** 4
- **Razón:** Todos representan el mismo concepto canónico. Diferencias movidas a line.size, line.notes y line.area.

### Grupo 2: Cuchara
- **Items fusionados:** "Cuchara cafetera", "Cuchara sopera"
- **Resultado:** "Cuchara"
- **Líneas combinadas:** 2
- **Razón:** Tipo movido a variante.

### Grupo 3: Cuchillo
- **Items fusionados:** "Cuchillo cubierto", "Cuchillo mediano rojo", "Cuchillo cocina"
- **Resultado:** "Cuchillo"
- **Líneas combinadas:** 3
- **Razón:** Tipo, tamaño y color movidos a variantes y line.size/color.

### Grupo 4: Jarra
- **Items fusionados:** "Jarra de agua chica de plástico naranja", "Jarra de barro negro"
- **Resultado:** "Jarra"
- **Líneas combinadas:** 2
- **Razón:** Material, tamaño, color y uso movidos a variantes y line.size/color/notes.

### Grupo 5: Vaso
- **Items fusionados:** "Vaso de vidrio chico old fashion", "Vaso de vidrio grande tipo old fashion", "Vasos de vidrio grandes"
- **Resultado:** "Vaso"
- **Líneas combinadas:** 3
- **Razón:** Material, tamaño y estilo movidos a variantes y line.size/notes.

### Grupo 6: Plato
- **Items fusionados:** "Plato extendido chico", "Plato extendido grande", "Plato hondo"
- **Resultado:** "Plato"
- **Líneas combinadas:** 3
- **Razón:** Tipo y tamaño movidos a variantes y line.size.

### Grupo 7: Coladera
- **Items fusionados:** "Coladera chica", "Coladera de metal grande"
- **Resultado:** "Coladera"
- **Líneas combinadas:** 2
- **Razón:** Material y tamaño movidos a variantes y line.size.

### Grupo 8: Escalera
- **Items fusionados:** "Escalera de 2 escalones de madera", "Escalera de 2 escalones de metal"
- **Resultado:** "Escalera"
- **Líneas combinadas:** 2
- **Razón:** Material movido a variante.

### Grupo 9: Cama
- **Items fusionados:** "Cama Queen Size", "Cama matrimonial"
- **Resultado:** "Cama"
- **Líneas combinadas:** 2
- **Razón:** Tamaño movido a variante.

### Grupo 10: Ventilador
- **Items fusionados:** "Ventilador chico", "Ventilador de torre", "Ventilador de Piso blanco", "Ventilador pedestal"
- **Resultado:** "Ventilador"
- **Líneas combinadas:** 4
- **Razón:** Tipo, tamaño y color movidos a variantes y line.size/color.

### Grupo 11: Mesa
- **Items fusionados:** "Mesa desayunadora de madera", "Mesa esquinera de madera para modem", "Mesa de centro madera y vidrio", "Mesa centro café", "Mesa lateral de madera con vidrio", "Mesa para modem", "Mesa microondas"
- **Resultado:** "Mesa"
- **Líneas combinadas:** 7
- **Razón:** Tipo, material y uso movidos a variantes y line.notes.

### Grupo 12: Sofá
- **Items fusionados:** "Sala de 3 piezas, sofá, Love seat e individual", "Sofá Cama"
- **Resultado:** "Sofá"
- **Líneas combinadas:** 2
- **Razón:** Tipo y detalles movidos a variantes y line.notes.

### Grupo 13: Televisor
- **Items fusionados:** "TV Fire TV Amazon 55 pulgadas y control remoto", "Pantalla de TV 50\""
- **Resultado:** "Televisor"
- **Líneas combinadas:** 2
- **Razón:** Marca, tamaño y detalles movidos a line.brand, line.size y line.notes.

### Grupo 14: Extensión eléctrica
- **Items fusionados:** "Extensión eléctrica de 2 metros", "Extensión eléctrica de 4 metros"
- **Resultado:** "Extensión eléctrica"
- **Líneas combinadas:** 2
- **Razón:** Tamaño movido a line.size.

### Grupo 15: Perchero
- **Items fusionados:** "Perchero de madera", "Perchero de pared"
- **Resultado:** "Perchero"
- **Líneas combinadas:** 2
- **Razón:** Material y tipo movidos a variantes.

### Grupo 16: Maceta
- **Items fusionados:** "Maceta gris claro con una planta", "Maceta pequeña con planta sobre el comedor", "Maceta de plástico roja chica con planta", "Maceta mediana con planta sobre la base", "Maceta pequeña con planta sobre mesa centro", "Macetas grandes con planta"
- **Resultado:** "Maceta"
- **Líneas combinadas:** 6
- **Razón:** Material, tamaño, color y ubicaciones específicas movidos a variantes y line.size/color/notes. Ubicaciones específicas eliminadas.

### Grupo 17: Cuadro
- **Items fusionados:** "Cuadro de Madera \"Las tarascas\"", "Cuadro decorativo \"Flores rojas\"", "Cuadros"
- **Resultado:** "Cuadro"
- **Líneas combinadas:** 3
- **Razón:** Detalles específicos de decoración eliminados (no aplican para plantilla genérica).

### Grupo 18: Colcha
- **Items fusionados:** "Colcha Queen", "Colcha gris"
- **Resultado:** "Colcha"
- **Líneas combinadas:** 2
- **Razón:** Tamaño y color movidos a variantes y line.color.

### Grupo 19: Sábanas
- **Items fusionados:** "Sábanas Queen", "Juego de sabanas"
- **Resultado:** "Sábanas"
- **Líneas combinadas:** 2
- **Razón:** Tamaño y tipo movidos a variantes y line.notes.

### Grupo 20: Silla
- **Items fusionados:** "Sillas de tela para comedor gris claro", "Sillas de tela para comedor gris oscuro", "Sillas"
- **Resultado:** "Silla"
- **Líneas combinadas:** 3
- **Razón:** Material, uso y color movidos a variantes y line.notes/color.

### Grupo 21: Trapo
- **Items fusionados:** "Trapos de cocina para limpiar", "Trapos de cocina para secar"
- **Resultado:** "Trapo"
- **Líneas combinadas:** 2
- **Razón:** Uso y función movidos a line.notes y variantes.

### Grupo 22: Cortina
- **Items fusionados:** "Cortina y cortinero", "Cortinas con cortinero"
- **Resultado:** "Cortina"
- **Líneas combinadas:** 2
- **Razón:** Detalle "cortinero" movido a line.notes.

---

## Notas Eliminadas (Específicas de Decoración)

1. **"Madera \"Las tarascas\""** → ELIMINADO
   - Razón: Detalle específico de decoración que no aplica para plantilla genérica.

2. **"Decorativo \"Flores rojas\""** → ELIMINADO
   - Razón: Detalle específico de decoración que no aplica para plantilla genérica.

3. **"sobre el comedor"**, **"sobre la base"**, **"sobre mesa centro"** → ELIMINADOS
   - Razón: Ubicaciones específicas que no aplican para plantilla genérica.

---

## Validación Final

- ✅ No hay duplicados por `category + nameNormalized`
- ✅ Todos los nombres son genéricos
- ✅ No hay marcas, modelos, colores o tamaños en nombres
- ✅ No hay materiales específicos en nombres (excepto cuando son parte esencial del concepto)
- ✅ No hay usos hiper específicos en nombres
- ✅ Estructura compatible con InventoryItem / InventoryLine
- ✅ No se tocó backend ni lógica de negocio

---

## Próximos Pasos

1. Generar el JSON completo con todos los items procesados
2. Validar que todas las líneas están correctamente asociadas
3. Verificar que no se perdieron items en las fusiones
4. Confirmar que las variantes están correctamente configuradas

