// Prepopulated Activity Bank from Basketball Activity Bank.xlsx & Practice Plans
const DEFAULT_TAGS = [
  "dribbling", "shooting", "layups", "defense", "passing", 
  "rebounding", "free throws", "sprints", "team building", "plays/oob", "stance"
];

const PRESET_DRILLS = [
  {
    id: "drill-2dribble1v1",
    name: "2 DRIBBLE 1V1",
    duration: 15,
    equipment: "two balls, cone at top",
    notes: "1. Player 1A starts at top at cone, 1B starts under basketball with ball.\n2. Player 1B passes to 1A and runs out to close out.\n3. Player 1A has two dribbles; more dribbles is a turnover.\n4. Play continues until 1A scores or 1B gets the ball through violation or rebound.",
    tags: ["layups", "dribbling", "defense", "shooting", "rebounding", "stance"]
  },
  {
    id: "drill-advanced-dribbling",
    name: "ADVANCED DRIBBLING",
    duration: 10,
    equipment: "one ball for each player",
    notes: "Players line up 5-10 feet apart and practice various advanced dribbling techniques: through the leg, around the back, spin, behind the back, crossover, 2-dribble crossover, backwards dribble.",
    tags: ["dribbling", "sprints"]
  },
  {
    id: "drill-homerun",
    name: "HOMERUN",
    duration: 12,
    equipment: "two balls, one per group",
    notes: "1. Split players into two teams: one at foul line, one out of bounds under goal.\n2. Goal team dribbles fast around court perimeter.\n3. Foul line team shoots free throws. Made shot before runner returns = out.\n4. Switch after 3 outs.",
    tags: ["shooting", "dribbling", "free throws", "sprints", "team building"]
  },
  {
    id: "drill-cone-shooting",
    name: "CONE SHOOTING",
    duration: 10,
    equipment: "two balls, all cones in line at halfcourt",
    notes: "1. Split into two groups at opposite sides.\n2. Made shot = grab a cone and pass to next player.\n3. Team with most cones when line runs out wins.",
    tags: ["shooting", "sprints", "team building"]
  },
  {
    id: "drill-form-shooting",
    name: "FORM SHOOTING",
    duration: 8,
    equipment: "one ball per player or pair",
    notes: "Focus on BEEF (Balance, Eyes, Elbow, Follow-through). Start 3 feet from rim and shoot one-handed.",
    tags: ["shooting"]
  },
  {
    id: "drill-dribble-knockout",
    name: "DRIBBLE KNOCKOUT",
    duration: 10,
    equipment: "one ball per player",
    notes: "All players dribble within half-court trying to knock away others' balls while keeping their own dribble active.",
    tags: ["dribbling", "defense"]
  },
  {
    id: "drill-3v3-scrimmage",
    name: "3V3 SCRIMMAGE",
    duration: 20,
    equipment: "one ball, pinnies",
    notes: "Half-court 3v3 scrimmage. Focus on spacing, give-and-go, and defensive stance.",
    tags: ["defense", "passing", "shooting", "team building"]
  },
  {
    id: "drill-defensive-slides",
    name: "DEFENSIVE SLIDES & STANCE",
    duration: 8,
    equipment: "none",
    notes: "Line up facing coach. Slide on command without crossing feet, staying low in athletic stance.",
    tags: ["defense", "stance", "sprints"]
  },
  {
    id: "drill-give-and-go",
    name: "GIVE AND GO LAYUPS",
    duration: 10,
    equipment: "two balls",
    notes: "Pass to wing, cut hard to basket, catch return pass in stride for clean layup.",
    tags: ["passing", "layups"]
  },
  {
    id: "drill-out-of-bounds-plays",
    name: "OOB PLAYS PRACTICE",
    duration: 10,
    equipment: "one ball",
    notes: "Walk through and execute baseline/sideline out-of-bounds plays against light defense.",
    tags: ["plays/oob", "passing"]
  }
];