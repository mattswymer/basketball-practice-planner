// Coach-supplied drill bank. Descriptions and estimates are retained from the supplied list.
const DEFAULT_TAGS = ["layups","dribbling","defense","shooting","rebounding","triple threat","stance","passing","team building","plays","sprints","free throws","pivot","off-ball movement","post","warm up","stretch","rest"];
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
  "off-ball movement": "#63816b",
  "warm up": "#6b9a83",
  "stretch": "#8a9d78",
  "rest": "#87909d"
};
const COACH_DRILLS = [
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
const HISTORICAL_DRILLS = [
  {
    "name": "RELAY RACE",
    "duration": 7,
    "equipment": "two balls, one per group",
    "tags": [
      "dribbling",
      "passing",
      "sprints",
      "team building"
    ],
    "notes": "1. Players split into 2 groups and line up in a designated spot\n2. Players either run the obstacles or sprint down and back as fast as they can while dribbling\n3. When they return to the line, they pass the ball to the next player, who then goes\n4. The team who gets through all their players first wins",
    "id": "archive-relay-race",
    "source": "practice-sheet"
  },
  {
    "name": "BASKETBALL TAG",
    "duration": 10,
    "equipment": "ball for each player",
    "tags": [
      "dribbling",
      "team building",
      "sprints"
    ],
    "notes": "1. One player is \"it\"\n2. All players must dribble their basketball and stay away from the \"it\"\n3. If the \"it\" touches another person's ball, that person has to do 5 pushups and now they are \"it\"",
    "id": "archive-basketball-tag",
    "source": "practice-sheet"
  },
  {
    "name": "HOMERUN",
    "duration": 12,
    "equipment": "two balls, one per group",
    "tags": [
      "shooting",
      "dribbling",
      "free throws",
      "sprints",
      "team building"
    ],
    "notes": "1. Split players into two teams, one at the foul line the other out of bounds under the goal\n2. The players under the goal must run while dribbling around the perimeter of the court as fast as they can\n3. The team at the foul line must take turns shooting free throws\n4. If the foul line team makes it before runner returns, the player is out, otherwise they score a run\n5. After 3 outs, teams switch",
    "id": "archive-homerun",
    "source": "practice-sheet"
  },
  {
    "name": "CONE SHOOTING",
    "duration": 10,
    "equipment": "two balls, one per group, all cones in a line at halfcourt",
    "tags": [
      "shooting",
      "sprints",
      "team building"
    ],
    "notes": "1. Split players into two groups and line up at opposite sides to shoot\n2. Players shoot one at a time, if they make their shot, they pass to the next person and run to grab a cone\n3. If they miss, they get back in line\n4. The team with the most cones when the cones run out is the winner",
    "id": "archive-cone-shooting",
    "source": "practice-sheet"
  },
  {
    "name": "DUCK DUCK GOOSE",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "passing",
      "sprints",
      "team building"
    ],
    "notes": "1. All players line up in a large circle\n2. Coach passes the ball to one player, that player must pass the ball to the next player and then sprint around the outside of the circle\n3. The player wins and gets a point if they return to their spot to receive the pass",
    "id": "archive-duck-duck-goose",
    "source": "practice-sheet"
  },
  {
    "name": "SCORING COMPETITION",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting",
      "sprints"
    ],
    "notes": "1. Half the team steps onto the court, coach gives them the ball\n2. They must make as many shots as possible in 30 seconds\n3. When time is up, next team takes a turn\n4. Loser must run down and back",
    "id": "archive-scoring-competition",
    "source": "practice-sheet"
  },
  {
    "name": "SPOT SHOOTING - MODIFIED HORSE",
    "duration": 10,
    "equipment": "one ball per player",
    "tags": [
      "shooting"
    ],
    "notes": "1. Players line up and shoot from a spot\n2. They track the number of makes as a team\n3. They move to different spots, chosen by player\n4. 1 point for each make",
    "id": "archive-spot-shooting-modified-horse",
    "source": "practice-sheet"
  },
  {
    "name": "SCRIMMAGE",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting",
      "defense",
      "dribbling",
      "rebounding"
    ],
    "notes": "1. Offense receives ball and tries to score\n2. If the offense scores, they stay on the court\n3. If the defense gets the ball, they are now on offense",
    "id": "archive-scrimmage",
    "source": "practice-sheet"
  },
  {
    "name": "ZIG ZAG PASS SHOOTING",
    "duration": 10,
    "equipment": "three balls",
    "tags": [
      "layups",
      "shooting",
      "passing",
      "team building"
    ],
    "notes": "1. Players line up in an offset pattern 15 feet apart down center court\n2. The first player passes diagonally, then follows the ball and stands in the new spot they passed to\n3. Ball continues moving player to player until the last player catches and scores\n4. Last player moves to the front, drill starts over",
    "id": "archive-zig-zag-pass-shooting",
    "source": "practice-sheet"
  },
  {
    "name": "1V1",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting",
      "defense",
      "dribbling",
      "rebounding"
    ],
    "notes": "1. Offense receives ball and tries to score\n2. If the offense scores, they stay on the court\n3. If the defense gets the ball, they are now on offense",
    "id": "archive-1v1",
    "source": "practice-sheet"
  },
  {
    "name": "2V2",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting",
      "defense",
      "dribbling",
      "rebounding"
    ],
    "notes": "1. Offense receives ball and tries to score\n2. If the offense scores, they stay on the court\n3. If the defense gets the ball, they are now on offense",
    "id": "archive-2v2",
    "source": "practice-sheet"
  },
  {
    "name": "3V3",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting",
      "defense",
      "dribbling",
      "rebounding"
    ],
    "notes": "1. Offense receives ball and tries to score\n2. If the offense scores, they stay on the court\n3. If the defense gets the ball, they are now on offense",
    "id": "archive-3v3",
    "source": "practice-sheet"
  },
  {
    "name": "LAYUPS / SHOOTING",
    "duration": 10,
    "equipment": "ball for each player",
    "tags": [
      "layups",
      "shooting"
    ],
    "notes": "1. All players line up on wing and take turns laying the ball up\n2. Move to different areas on the court for players",
    "id": "archive-layups-shooting",
    "source": "practice-sheet"
  },
  {
    "name": "CATCH AND SHOOT",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "layups",
      "shooting"
    ],
    "notes": "1. Coach stands on the wing, players line up under the goal\n2. First player steps out onto the block, coach tosses a pass, player catches, turns, shoots\n3. Go to the back of the line, next player up\n[left/right]",
    "id": "archive-catch-and-shoot",
    "source": "practice-sheet"
  },
  {
    "name": "BALL SECURITY",
    "duration": 7,
    "equipment": "ball for each player",
    "tags": [
      "triple threat",
      "defense"
    ],
    "notes": "1. All players line up and hold their ball\n2. First player goes down the line trying to knock the ball out of each of their hands\n3. Then the next person goes until all players have gone",
    "id": "archive-ball-security",
    "source": "practice-sheet"
  },
  {
    "name": "COACH KEEP AWAY",
    "duration": 10,
    "equipment": "one ball",
    "tags": [
      "off-ball movement",
      "layups",
      "passing",
      "shooting",
      "team building"
    ],
    "notes": "1. All players get into position\n2. Players must pass the ball to every player without dribbling while coach tries to intercept\n3. After all players have touched the ball, any player may shoot\n4. If the coach intercepts more passes than the players shoot, players must do 10 pushups",
    "id": "archive-coach-keep-away",
    "source": "practice-sheet"
  },
  {
    "name": "1V1 DRIBBLING OFFENSE SIMULTATION",
    "duration": 10,
    "equipment": "two balls",
    "tags": [
      "dribbling",
      "passing",
      "shooting"
    ],
    "notes": "1. Player 1A starts behind halfcourt, 2A on the wing, 3A in the paint\n2. Player 1A must take the ball over halfcourt and pass to 2A who then passes to 3A to shoot\n3. The coach is trying to deny the pass to 2A",
    "id": "archive-1v1-dribbling-offense-simultation",
    "source": "practice-sheet"
  },
  {
    "name": "FAST BREAK",
    "duration": 10,
    "equipment": "ball for each player",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "sprints",
      "shooting"
    ],
    "notes": "1. Players line up at halfcourt and hand their ball to coach\n2. Coach rolls or tosses ball slightly towards goal to simulate a steal\n3. Player sprints after the ball, grabs it, and goes for a layup\n4. Player goes to the back of the line and next player steps up",
    "id": "archive-fast-break",
    "source": "practice-sheet"
  },
  {
    "name": "FAST BREAK TRIPLE PASSING",
    "duration": 10,
    "equipment": "two balls",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "sprints",
      "shooting"
    ],
    "notes": "1. Players split into three lines at halfcourt corners, and center, center line has balls\n2. Player 1 starts with the ball simulating a fast break, players 2 and 3 sprint up the sides\n3. Player 1 passes to player 2 or 3 who then quickly passes to the other for a layup",
    "id": "archive-fast-break-triple-passing",
    "source": "practice-sheet"
  },
  {
    "name": "PICK AND ROLL",
    "duration": 8,
    "equipment": "two balls",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "triple threat"
    ],
    "notes": "1. Players line up at the top of the 3-point line in two lines, one with balls\n2. Player 1 steps out in triple threat, player 2 sets a screen\n3. Player 1 goes around the screen and drives and player 2 rolls\n4. Alternate which player scores\n5. Players switch lines",
    "id": "archive-pick-and-roll",
    "source": "practice-sheet"
  },
  {
    "name": "TRIANGLE PASSING TO POST",
    "duration": 8,
    "equipment": "two balls",
    "tags": [
      "layups",
      "passing",
      "post",
      "shooting"
    ],
    "notes": "1. Players line up at top of 3pt line, player 1 to the strongside elbow, player 2 on the wing\n2. Player 3 has the ball at the top, passes to player 2 who then quickly passes to player 1 in the middle\n3. Player 1 catches and either shoots or pump fakes, dribbles up, and shoots\n4. Player 3 goes to 1, 1 goes to 2, 2 goes to the back of the line",
    "id": "archive-triangle-passing-to-post",
    "source": "practice-sheet"
  },
  {
    "name": "REBOUND SCRIMMAGE",
    "duration": 12,
    "equipment": "1 ball",
    "tags": [
      "defense",
      "rebounding"
    ],
    "notes": "1. Two lines at the top, first pair steps out on defense, second on offense\n2. Players 1A and 2A line up ready to box out, players 1B and 2B prepare for an offensive rebound\n3. Coach shoots the ball to miss\n4. If team A gets the ball, the outlet to coach as fast as they can\n5. If team B gets the ball, they try to score in less than 5 seconds\n6. Offense rotates to defense, new offense",
    "id": "archive-rebound-scrimmage",
    "source": "practice-sheet"
  },
  {
    "name": "DRIBBLING, PASSING, SHOOTING STATIONS",
    "duration": 15,
    "equipment": "one ball for each player, cones 10 feet from wall, cones on 2nd hash, cones along sideline",
    "tags": [
      "dribbling",
      "layups",
      "passing",
      "post",
      "rebounding",
      "shooting"
    ],
    "notes": "1. Separate players into 3 groups, assign each group to one of the three stations\n2. Players complete the task at the station for one minute and then rotate\n3. Drill is over once all players have completed all drills\n4A. Dribbling Station - players dribble through the cones without traveling or double dribbling\nCoach can try to knock ball away occasionally\n4B. Passing Station - players practice bounce passing and chest passing at the wall so that it bounces back to them\n4C. Shooting Station - players practice the Mikan drill, shooting from each block and making as many shots as possible",
    "id": "archive-dribbling-passing-shooting-stations",
    "source": "practice-sheet"
  },
  {
    "name": "KEEP AWAY DRILL",
    "duration": 8,
    "equipment": "one ball",
    "tags": [
      "defense",
      "dribbling",
      "off-ball movement",
      "passing"
    ],
    "notes": "1. Separate players into 2 groups\n2. One team is on offense and they can do anything but score\n3. The defense must try to get the ball\n4. The offense has 30 seconds to make 10 passes",
    "id": "archive-keep-away-drill",
    "source": "practice-sheet"
  },
  {
    "name": "V-CUT PIVOT FOOT DRILL",
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
    "id": "archive-v-cut-pivot-foot-drill",
    "source": "practice-sheet"
  },
  {
    "name": "3-OUT IMPLEMENTATION",
    "duration": 10,
    "equipment": "1 cone at top, 4 cones at blocks and short corners",
    "tags": [
      "plays",
      "off-ball movement"
    ],
    "notes": "1. Players 1A-5A stand in each of the spots\n2. When the ball is on the wing, weakside guards switch, weakside post flashes\n3. When the ball is at the elbow, weakside guard drops to block",
    "id": "archive-3-out-implementation",
    "source": "practice-sheet"
  },
  {
    "name": "FREE THROW RUNNING",
    "duration": 5,
    "equipment": "one ball",
    "tags": [
      "free throws",
      "sprints"
    ],
    "notes": "1. First player steps up to shoot a free throw\n2. If he makes it, next player shoots; if he misses it, players run freethrow and back and halfcourt and back",
    "id": "archive-free-throw-running",
    "source": "practice-sheet"
  }
];
const PRESET_DRILLS = [...COACH_DRILLS, ...HISTORICAL_DRILLS];
