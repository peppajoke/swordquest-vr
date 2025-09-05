# VR Sword Fighting Game - Enemy Documentation

## Complete Enemy List & Details

This VR sword fighting game features **13 different enemy types** with unique abilities, stats, and combat behaviors. Each enemy has distinct characteristics that create varied combat encounters.

---

## Ground Enemies (10 Types)

### 1. 🪖 GRUNT SOLDIERS
- **Role**: Basic melee fighters
- **Health**: 50 HP
- **Damage**: 15 per attack
- **Attack Speed**: 2.0 seconds
- **Size**: Medium (0.8×1.5×0.8)
- **Color**: Brown (#8B4513)
- **Behavior**: Standard melee combat, walks toward player
- **Spawned**: 3 units positioned at various locations

### 2. 🔫 RIFLEMEN
- **Role**: Medium range shooters
- **Health**: 75 HP
- **Damage**: 20 per projectile
- **Attack Speed**: 1.5 seconds
- **Size**: Medium-slim (0.7×1.6×0.7)
- **Color**: Olive (#4B8B3B)
- **Behavior**: Fires projectiles at medium range, maintains distance
- **Spawned**: 2 units positioned strategically

### 3. 🛡️ HEAVY GUNNERS
- **Role**: Slow but devastating ranged attackers
- **Health**: 150 HP
- **Damage**: 35 per attack
- **Attack Speed**: 3.0 seconds (slow but powerful)
- **Size**: Large (1.2×1.8×1.2)
- **Color**: Dark slate (#2F4F4F)
- **Behavior**: High damage, slow movement, long-range capabilities
- **Spawned**: 2 units positioned as defensive anchors

### 4. 🥷 ASSASSINS
- **Role**: Fast melee with teleport ability
- **Health**: 40 HP (low health, high mobility)
- **Damage**: 25 per attack
- **Attack Speed**: 0.8 seconds (very fast)
- **Size**: Small (0.6×1.4×0.6)
- **Color**: Almost black (#1C1C1C)
- **Special Ability**: **Teleportation** - Can instantly teleport close to player
- **Behavior**: Hit-and-run tactics, teleports when cooldown available
- **Spawned**: 2 units for high-mobility harassment

### 5. 💣 BOMBERS
- **Role**: AOE explosion specialists
- **Health**: 60 HP
- **Damage**: 50 per explosion (Area of Effect)
- **Attack Speed**: 4.0 seconds (slow but devastating)
- **Size**: Medium-wide (0.9×1.3×0.9)
- **Color**: Orange red (#FF4500)
- **Special Ability**: **AOE Explosions** - Damage affects multiple targets in radius
- **Behavior**: Approach and detonate for massive area damage
- **Spawned**: 2 units for crowd control threats

### 6. 🎯 SNIPERS
- **Role**: Long range precision attackers
- **Health**: 80 HP
- **Damage**: 40 per shot (high precision)
- **Attack Speed**: 2.5 seconds
- **Size**: Tall-slim (0.7×1.7×0.7)
- **Color**: Dark slate blue (#483D8B)
- **Behavior**: Long-range attacks, maintains maximum distance
- **Spawned**: 2 units positioned for battlefield coverage

### 7. 🔥 BERSERKERS
- **Role**: Rage mode melee fighters
- **Health**: 120 HP
- **Damage**: 30 normal / **45 in rage mode**
- **Attack Speed**: 1.2 seconds normal / **0.6 seconds in rage**
- **Size**: Large (1.0×1.6×1.0)
- **Color**: Dark red (#8B0000)
- **Special Ability**: **Rage Mode** - Activates when damaged, increases damage and speed
- **Behavior**: Becomes extremely dangerous when enraged
- **Spawned**: 2 units for intense close combat

### 8. 🛡️ SHIELD GUARDS
- **Role**: Defensive tanks with high health
- **Health**: 200 HP (highest ground enemy health)
- **Damage**: 12 per attack (low damage)
- **Attack Speed**: 2.2 seconds
- **Size**: Large (1.1×1.9×1.1)
- **Color**: Steel blue (#4682B4)
- **Behavior**: Tank role, absorbs damage while others attack
- **Spawned**: 2 units as defensive anchors

### 9. 🔮 MAGES
- **Role**: Magic projectile casters
- **Health**: 90 HP
- **Damage**: 28 per magic projectile
- **Attack Speed**: 1.8 seconds
- **Size**: Medium (0.8×1.6×0.8)
- **Color**: Violet (#9400D3)
- **Special Ability**: **Magic Projectiles** - Fires mystical energy attacks
- **Behavior**: Medium-range magical combat
- **Spawned**: 2 units for magical variety

### 10. 👹 BOSS
- **Role**: Final boss with massive health
- **Health**: 1000 HP (10x normal enemy health)
- **Damage**: 60 per attack + **30 AOE explosion damage**
- **Attack Speed**: 1.0 seconds (fast for a boss)
- **Size**: Huge (3.0×4.0×3.0)
- **Color**: Pure black (#000000)
- **Special Ability**: **Explosive Attacks** - Each attack creates AOE damage
- **Behavior**: Central battlefield threat, massive damage potential
- **Spawned**: 1 unit - the ultimate challenge

---

## Flying Enemies (3 Types)

### 11. 🤖 DRONES
- **Role**: Aerial reconnaissance and assault
- **Health**: 45 HP
- **Damage**: 18 per laser
- **Attack Speed**: 1.2 seconds
- **Size**: Wide-flat (0.6×0.4×1.2)
- **Color**: Silver (#C0C0C0)
- **Flight Height**: 4-6 units above ground
- **Behavior**: Aerial laser attacks, maintains flight patterns
- **Spawned**: 3 units for air superiority

### 12. 🐝 WASPS
- **Role**: Fast aerial harassers
- **Health**: 35 HP (lowest health)
- **Damage**: 12 per sting
- **Attack Speed**: 1.0 seconds (very fast)
- **Size**: Small (0.4×0.3×0.8)
- **Color**: Gold (#FFD700)
- **Flight Height**: 5-8 units above ground
- **Behavior**: High-speed aerial harassment, quick hit-and-run
- **Spawned**: 3 units for constant aerial pressure

### 13. 🔥 PHOENIX
- **Role**: Elite flying boss with fire attacks
- **Health**: 250 HP (second highest after main boss)
- **Damage**: 45 per fire attack + **13.5 AOE explosion damage**
- **Attack Speed**: 1.5 seconds
- **Size**: Large wingspan (2.0×1.5×3.0)
- **Color**: Tomato red (#FF6347)
- **Flight Height**: 10 units (highest flyer)
- **Special Ability**: **Fire Explosions** - Creates burning AOE damage zones
- **Behavior**: Elite aerial threat with devastating fire attacks
- **Spawned**: 1 unit - aerial mini-boss

---

## Combat Statistics Summary

### Total Enemy Count: **23 Enemies**
- **Ground Forces**: 20 enemies (10 different types)
- **Air Forces**: 7 enemies (3 different types)

### Health Distribution:
- **Lowest**: Wasp (35 HP)
- **Highest**: Boss (1000 HP)
- **Average Ground Enemy**: ~108 HP
- **Average Flying Enemy**: ~110 HP

### Damage Distribution:
- **Lowest**: Shield Guard (12 damage)
- **Highest**: Boss (60 + 30 AOE = 90 total)
- **Most AOE Damage**: Bomber (50 AOE)

### Special Abilities:
- **Teleportation**: Assassins
- **Rage Mode**: Berserkers
- **AOE Explosions**: Bombers, Boss, Phoenix
- **Magic Projectiles**: Mages
- **Fire Attacks**: Phoenix
- **Aerial Combat**: Drones, Wasps, Phoenix

---

## Strategic Notes

### Enemy Positioning:
- Enemies are strategically placed across a 200×100 unit battlefield
- Ground enemies cover front-line to back-line positions
- Flying enemies patrol at different altitudes for layered threats
- Boss positioned centrally as primary target

### Combat Dynamics:
- **Early Threats**: Assassins teleport for immediate pressure
- **Sustained Damage**: Riflemen and Snipers provide consistent ranged attacks  
- **Tank Line**: Heavy Gunners and Shield Guards form defensive backbone
- **Elite Threats**: Boss and Phoenix require focused attention
- **Crowd Control**: Bombers create area denial with explosions

### Game Reset System:
- When player dies, ALL 23 enemies reset to full health
- Enemy AI states reset (rage mode, teleport cooldowns, etc.)
- Creates fresh battlefield experience on each respawn

This enemy system creates a complex, multi-layered combat experience with varied threats requiring different tactical approaches!