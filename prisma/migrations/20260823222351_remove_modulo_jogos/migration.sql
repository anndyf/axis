-- DropForeignKey
ALTER TABLE "game_matches" DROP CONSTRAINT "game_matches_modality_id_fkey";

-- DropForeignKey
ALTER TABLE "game_matches" DROP CONSTRAINT "game_matches_team1_id_fkey";

-- DropForeignKey
ALTER TABLE "game_matches" DROP CONSTRAINT "game_matches_team2_id_fkey";

-- DropForeignKey
ALTER TABLE "game_matches" DROP CONSTRAINT "game_matches_winner_id_fkey";

-- DropForeignKey
ALTER TABLE "sports_team_members" DROP CONSTRAINT "sports_team_members_student_id_fkey";

-- DropForeignKey
ALTER TABLE "sports_team_members" DROP CONSTRAINT "sports_team_members_team_id_fkey";

-- DropForeignKey
ALTER TABLE "sports_teams" DROP CONSTRAINT "sports_teams_modality_id_fkey";

-- DropTable
DROP TABLE "game_matches";

-- DropTable
DROP TABLE "sport_modalities";

-- DropTable
DROP TABLE "sports_settings";

-- DropTable
DROP TABLE "sports_team_members";

-- DropTable
DROP TABLE "sports_teams";
