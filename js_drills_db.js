// Coach-supplied drill bank. Descriptions and estimates are retained from the supplied list.
const DEFAULT_TAGS = ["layups","dribbling","defense","shooting","rebounding","triple threat","stance","passing","team building","plays","sprints","free throws","pivot","post","warm up","stretch","rest"];
const TAG_COLORS = {
  "dribbling": "#3b82a0",
  "shooting": "#c58a35",
  "layups": "#c06b45",
  "defense": "#5572a8",
  "passing": "#378a78",
  "rebounding": "#8568a8",
  "free throws": "#a27b39",
  "team building": "#9b6e89",
  "sprints": "#b45d55",
  "plays": "#5c7895",
  "stance": "#647a55",
  "triple threat": "#a16d45",
  "pivot": "#6b8c85",
  "post": "#786b9c",
  "off-ball movement": "#63816b",
  "warm up": "#6b9a83",
  "stretch": "#8a9d78",
  "rest": "#87909d"
};
const PRESET_DRILLS = [
  {
    "name": "2 DRIBBLE 1V1",
    "duration": 15,
    "equipment": "two balls, cone at top",
    "tags": [
      "layups",
      "dribbling",
      "defense",
      "shooting",
      "rebounding",
      "triple threat",
      "stance"
    ],
    "notes": "1. Player 1A starts at top at cone, 1B starts under basketbal with ball\n2. Player 1B passes to 1A and runs out to close out\n3. Player 1A has two dribbles; more dribbles is a turnover\n4. Play continues until 1A scores or 1B gets the ball through violation, turnover, or rebound",
    "id": "coach-2-dribble-1v1",
    "source": "coach"
  },
  {
    "name": "3V3 SCRIMMAGE",
    "duration": 15,
    "equipment": "one ball",
    "tags": [
      "defense",
      "dribbling",
      "layups",
      "passing",
      "rebounding",
      "shooting",
      "team building"
    ],
    "notes": "1. Divide teams into teams of three.\n2. Teams play standard basketball for a time limit or score limit",
    "id": "coach-3v3-scrimmage",
    "source": "coach"
  },
  {
    "name": "3V3 ZONE PRINCIPLES",
    "duration": 9,
    "equipment": "one ball",
    "tags": [
      "plays"
    ],
    "notes": "1. Defense sets up in a 1-2 defense\n2. Offense uses principles of ball movement to beat the zone",
    "id": "coach-3v3-zone-principles",
    "source": "coach"
  },
  {
    "name": "ADVANCED DRIBBLING",
    "duration": 10,
    "equipment": "one ball for each player",
    "tags": [
      "dribbling"
    ],
    "notes": "1. Players line up 5-10 feet apart\n2. Players practice various advanced dribbling techniques including: through the leg [right/left], through both legs [right/left], around the back [right/left], spin [right/left], behind the back, crossover, 2-dribble crossover, high crossover, backwards through legs [right/left], through same leg [right/left], dribble to stand [right/left], low dribble [right/left]",
    "id": "coach-advanced-dribbling",
    "source": "coach"
  },
  {
    "name": "CLOSE OUT DRILL",
    "duration": 10,
    "equipment": "half team has balls, cone at elbow",
    "tags": [
      "rebounding",
      "shooting",
      "defense"
    ],
    "notes": "1. Player 1A stands at elbow, player 1B stands out of bounds below the block with a ball\n2. Player 1B bounch passes to player 1A and then sprints out to contest\n3. Player 1A shoots\n4. 1A keeps rebounding and shooting until 1B gets the ball\n5. Player 1B moves to the elbow, player 1C stands where 1B started\nEmphasize defense not jumping and getting hands up, but staying ready for pumpfake; offense working on shooting quickly",
    "id": "coach-close-out-drill",
    "source": "coach"
  },
  {
    "name": "CONTROLLED SCRIMMAGE",
    "duration": 15,
    "equipment": "one ball",
    "tags": [
      "defense",
      "dribbling",
      "layups",
      "passing",
      "rebounding",
      "shooting",
      "stance",
      "triple threat"
    ],
    "notes": "1. 3v3 or 4v4\n2. Focus on proper defensive technique, spacing, moving without the ball, taking good shots",
    "id": "coach-controlled-scrimmage",
    "source": "coach"
  },
  {
    "name": "DEFENSE - 1-3-1",
    "duration": 4,
    "equipment": "one ball for coach",
    "tags": [
      "defense",
      "plays"
    ],
    "notes": "1. 1 at top, 2 on right, 3 on left, 4 in back, 5 in middle\n2. Trap in all corners, 4 is the safety",
    "id": "coach-defense-1-3-1",
    "source": "coach"
  },
  {
    "name": "DEFENSIVE STANCE",
    "duration": 8,
    "equipment": "four cones each at corner, elbow extended, timline, halfcourt",
    "tags": [
      "defense",
      "sprints",
      "stance"
    ],
    "notes": "1. Cones set up in \"zig-zag\" pattern\n2. Player will defensive slide to first cone, sprint to second, slide to third, sprint to fourth\n3. Player then backpedals to the back of the line",
    "id": "coach-defensive-stance",
    "source": "coach"
  },
  {
    "name": "DRIBBLE COMPETITION",
    "duration": 10,
    "equipment": "one ball for each player",
    "tags": [
      "dribbling",
      "defense"
    ],
    "notes": "1. Players start inside the 3-point line dribbling and must attempt to knock others players' balls out of bounds\n2. Fouls and violations and the player is out\n3. After a minute, boundaries reduce to paint\n4. Last player dribbling wins",
    "id": "coach-dribble-competition",
    "source": "coach"
  },
  {
    "name": "DRIBBLING",
    "duration": 10,
    "equipment": "one ball for each player, 4 cones in straight line",
    "tags": [
      "dribbling",
      "sprints"
    ],
    "notes": "1. Stationary [right/left]\n2. Stationary crossover\n3. Dribble around cones down, speed dribble back [right/left]\n4. Speed dribble down, backwards dribble back [right/left]",
    "id": "coach-dribbling",
    "source": "coach"
  },
  {
    "name": "ELBOW SHOOTING DRILL",
    "duration": 10,
    "equipment": "half team has balls, cone at free throw line and elbows extended",
    "tags": [
      "passing",
      "shooting",
      "triple threat"
    ],
    "notes": "1. Half the team behind the 3-point line cone elbow extended, half behind the opposite side\n2. Player 1A has the ball [triple threat], player 1B cuts to the free throw line\n3. Player 1A passes to player 1B who catches and shoots\n4. Player 1B gets their own make/miss and both players go to the back of the opposite line",
    "id": "coach-elbow-shooting-drill",
    "source": "coach"
  },
  {
    "name": "FAST BREAK PASSING",
    "duration": 10,
    "equipment": "two balls",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "sprints",
      "shooting"
    ],
    "notes": "1. Players split into two lines at halfcourt corner, one side has balls\n2. Player 1A dribbles to the 3-point line and then throws a lob pass or bounce pass to player 1B\n3. Player 1B catches and takes the shot\n4. Player 1B gets the ball and both players go to the back of the opposite line",
    "id": "coach-fast-break-passing",
    "source": "coach"
  },
  {
    "name": "FREE THROWS",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "shooting",
      "free throws"
    ],
    "notes": "1. Players line up in a standard free throw line up\n2. Players take two free throws and rotate",
    "id": "coach-free-throws",
    "source": "coach"
  },
  {
    "name": "GOTCHA",
    "duration": 15,
    "equipment": "three balls",
    "tags": [
      "shooting",
      "rebounding",
      "free throws"
    ],
    "notes": "1. Player 1A shoots a freethrow\n2. Remaining players line up being player 1A, player 1B shoots a freethrow immediately after 1A\n3. Both players continue to shoot until the score\n4. If 1A scores first, passes to 1D\n5. If 1B scores first, 1A is out, both players pass to 1D and 1E\n6. 1C then shoots a freethrow and play continues until one player remains",
    "id": "coach-gotcha",
    "source": "coach"
  },
  {
    "name": "INTRODUCTIONS",
    "duration": 2,
    "equipment": "",
    "tags": [
      "team building"
    ],
    "notes": "",
    "id": "coach-introductions",
    "source": "coach"
  },
  {
    "name": "KEEP AWAY",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "defense",
      "dribbling",
      "passing",
      "team building"
    ],
    "notes": "1. One team starts with the ball, other team on defense\n2. Offense must keep possession for 30 seconds and cannot score\n3. All other rules apply\nEmphasize urgency on defense",
    "id": "coach-keep-away",
    "source": "coach"
  },
  {
    "name": "LAYUP LINES",
    "duration": 10,
    "equipment": "half team has balls, cones at each wing",
    "tags": [
      "layups",
      "dribbling"
    ],
    "notes": "1. Player 1A starts at the 3-point line cone, dribbles to the goal, lays the ball up\n2. Player 1B starts at the opposite 3-point line cone, starts at the same time as Player 1A, and rebounds the miss or takes the make to the back of the A line\n3. After the last player goes twice, same thing on the other side",
    "id": "coach-layup-lines",
    "source": "coach"
  },
  {
    "name": "NO DRIBBLE SCRIMMAGE",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "passing",
      "shooting",
      "defense",
      "triple threat",
      "rebounding"
    ],
    "notes": "1. 3v3 or 4v4\n2. Players are not allowed to dribble [dribble = turnover]",
    "id": "coach-no-dribble-scrimmage",
    "source": "coach"
  },
  {
    "name": "OOB PLAYS - LINE",
    "duration": 5,
    "equipment": "one ball",
    "tags": [
      "plays"
    ],
    "notes": "1. 1 takes the ball out, 2 right corner, 4 right block, 3 left corner, 5 left block\n2. Weakside post starts at the elbow\n3. 1 slaps the ball, weakside post drops to weakside block\n4. If 1 passes to post, they score, if 1 passes to wing, post pin screens and 1 steps in to shoot",
    "id": "coach-oob-plays-line",
    "source": "coach"
  },
  {
    "name": "OOB PLAYS - SQUARE",
    "duration": 5,
    "equipment": "one ball",
    "tags": [
      "plays"
    ],
    "notes": "1. 1 takes the ball out, 2 right elbow, 4 right block, 3 left elbow, 5 left block\n2. Strongside block and elbow either pinscreen for or switch with weakside block and elbow\n3. If weakside block is open, pass and shoot\n4. If ball goes to strongside block or elbow, 1 steps into the middle for the shot",
    "id": "coach-oob-plays-square",
    "source": "coach"
  },
  {
    "name": "PASS TO SCORE",
    "duration": 12,
    "equipment": "two balls, cone at top, cone on the wing",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "shooting"
    ],
    "notes": "1. Players split up and line up at the top (B) and wing (A), balls at the top\n2. Player 1B passes to player 1A\n3. Player 1A uses a dribble move and gets into shooting range to take the shot\n4. Player 1A gets their own rebound and passes to 2B, 1B goes to the back of line A",
    "id": "coach-pass-to-score",
    "source": "coach"
  },
  {
    "name": "PASSING TO LEARN NAMES",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "passing",
      "team building",
      "triple threat"
    ],
    "notes": "1. Players line up, player 1A is opposite\n2. Player 1A has the ball and passes it to 1B, calling out their name\n3. Player 1B passes back calling out 1A's name\n4. Player 1A slides down and passes to player 2B, calling out their name\n5. Player 2B passes back calling out 1A's name\n6. As player 1A is finishing, player 1B starts the same process and 1A gets at the end of the line\nUse chest passes, bounce passes, and overhead passes",
    "id": "coach-passing-to-learn-names",
    "source": "coach"
  },
  {
    "name": "PIVOT FOOT DRILL",
    "duration": 10,
    "equipment": "three balls, one cone at wing, one cone at top",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "triple threat",
      "pivot"
    ],
    "notes": "1. Player 1A starts on wing and V-cuts\n2. Player 1B starts at top and passes after V-cut\n3. Player 1A catches with inside pivot, triple threat, jab to center, drives baseline for lay-up\n4. Player 1B goes to wing\nPractice jab to center drive baseline and jab to baseline drive center",
    "id": "coach-pivot-foot-drill",
    "source": "coach"
  },
  {
    "name": "PLAYS - 2 OUT",
    "duration": 5,
    "equipment": "one ball",
    "tags": [
      "plays"
    ],
    "notes": "1. 1 top left, 2 top right, 4 bottom right, 5 bottom left, 3 middle\n2. If ball goes to middle, bottom posts cut to blocks\n3. If ball goes to corner, middle drops to strongside block, weakside corner cuts to middle\nIf ball is in corner, weakside top can cut to weakside block",
    "id": "coach-plays-2-out",
    "source": "coach"
  },
  {
    "name": "PLAYS - 3 OUT",
    "duration": 5,
    "equipment": "one ball",
    "tags": [
      "plays"
    ],
    "notes": "1. 1 at the top, 2 right wing, 4 right block, 3 left wing, 5 left block\n2. If 1 passes to wing, weakside post flashes to strongside elbow\n3. If wing passes to post, weakside wing slashes to weakside post",
    "id": "coach-plays-3-out",
    "source": "coach"
  },
  {
    "name": "POST DEFENSE",
    "duration": 10,
    "equipment": "one ball, cone at upper post block",
    "tags": [
      "defense",
      "rebounding",
      "shooting",
      "post"
    ],
    "notes": "1. Players line up out of bounds, 1A offense on block, 1B defense behind him\n2. Coach tosses the ball to 1A who tries to score while 1B keeps hands up without fouling\n3. Play continues until 1A scores or 1B gets a rebound\n4. 1A moves to the back of the line, 1B moves to 1A, new 1B\nEmphasize hands straight up, no body contact, and not fouling",
    "id": "coach-post-defense",
    "source": "coach"
  },
  {
    "name": "POST MOVES",
    "duration": 10,
    "equipment": "half team has balls, cones on wings and blocks",
    "tags": [
      "post",
      "passing",
      "shooting"
    ],
    "notes": "1. Player 1A starts just above the block, player 2A is on the same side wing, players 1B and 2B are opposite\n2. Players 2A and 2B have the ball and pass it down to players 1A/1B\n3. Players 1A/1B catch, turn, and shoot\n4. Players rotate 2A > 1A > 1B > 2B > 2A with lines forming behind 1B/2B\nWork on bounce pass and lob pass and post moves",
    "id": "coach-post-moves",
    "source": "coach"
  },
  {
    "name": "QUICK 2V2",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "defense",
      "dribbling",
      "layups",
      "passing",
      "post",
      "team building",
      "shooting",
      "rebounding",
      "stance",
      "triple threat"
    ],
    "notes": "1. Players form two lines at the top\n2. First two players step out on defense\n3. Offense tries to score and defense tries to get the ball\n4. Offense goes to defense, defense goes to the back, new offense steps out",
    "id": "coach-quick-2v2",
    "source": "coach"
  },
  {
    "name": "REBOUND DRILL",
    "duration": 8,
    "equipment": "one ball",
    "tags": [
      "rebounding"
    ],
    "notes": "1. All players stand in the paint\n2. Coach shoots\n3. All players attempt to get the rebound\n4. The player who gets the rebound gets to take a break\n5. Drill continues until last player gets a rebound",
    "id": "coach-rebound-drill",
    "source": "coach"
  },
  {
    "name": "RED LIGHT, GREEN LIGHT DRIBBLING",
    "duration": 10,
    "equipment": "one ball for each player",
    "tags": [
      "dribbling"
    ],
    "notes": "1. All players start on the sideline or baseline\n2. When the coach says \"green light\", the players dribble forward; \"yellow light\" the players dribble stationary; and \"red light\" the players jump stop\n3. The player who reaches the coach first is the winner\nOPTIONAL: The winner can be the new person who calls out red light green light",
    "id": "coach-red-light-green-light-dribbling",
    "source": "coach"
  },
  {
    "name": "TWO LINE CONTESTED SHOOTING DRILL",
    "duration": 8,
    "equipment": "two balls, one cone in paint",
    "tags": [
      "passing",
      "layups",
      "post",
      "shooting"
    ],
    "notes": "1. Players split up into two lines\n2. Players 1B and 2A have balls\n3. Player 1A loops around the cone to the opposite block\n4. Player 1B passes to 1A and contests 1A's shot\n5. Player 1B continues to loop around the cone to the opposite block\n6. Player 2A passes to 1B and contests 1B's shot\n7. Drill continues\nCan move the cone back for elbow shooting",
    "id": "coach-two-line-contested-shooting-drill",
    "source": "coach"
  },
  {
    "name": "WARM UP STRETCH",
    "duration": 5,
    "equipment": "none",
    "tags": [
      "warm up",
      "stretch"
    ],
    "notes": "1. Down and back jog (2x)\n2. Down and back arm swings (2x)\n3. Down and back leg kicks (2x)\n4. Down and back sprints (2x)",
    "id": "coach-warm-up-stretch",
    "source": "coach"
  },
  {
    "name": "WATER BREAK",
    "duration": 3,
    "equipment": "none",
    "tags": [
      "rest"
    ],
    "notes": "",
    "id": "coach-water-break",
    "source": "coach"
  }
];
