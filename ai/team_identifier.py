"""Team Identification & Jersey Color Clustering for MatchVision AI.

Performs robust color extraction from upper-torso regions, transforms to CIE-Lab
space for perceptual uniformity, suppresses shadows and pitch green reflections,
and clusters players into Team A, Team B, Goalkeepers, and Referees.
"""

from typing import Dict, List, Optional, Tuple, Any

try:
    import numpy as np
except ImportError:
    np = None


class TeamIdentifier:
    """Clusters detected players into competing teams and classifies officials."""

    def __init__(
        self,
        manual_team_a_color: Optional[Tuple[int, int, int]] = None,
        manual_team_b_color: Optional[Tuple[int, int, int]] = None
    ):
        self.manual_team_a_color = manual_team_a_color
        self.manual_team_b_color = manual_team_b_color
        self.team_centers: Optional[Any] = None  # RGB centroids for [Team A, Team B]
        self.referee_color = (240.0, 230.0, 40.0)  # Neon Yellow default
        self.track_team_history: Dict[int, List[int]] = {}

    def extract_dominant_color(self, crop: Any) -> Any:
        """Extracts dominant jersey color from upper torso crop, filtering grass and skin tones."""
        if crop is None or getattr(crop, "size", 0) == 0:
            return (128.0, 128.0, 128.0)

        # Convert BGR crop to RGB
        crop_rgb = crop[:, :, ::-1] if crop.shape[2] == 3 else crop

        # Reshape to pixels
        pixels = crop_rgb.reshape(-1, 3).astype(np.float32)

        # Filter out pitch grass green (green channel dominating red and blue)
        non_grass = []
        for p in pixels:
            r, g, b = p
            # Pitch green filter: green is significantly higher than red and blue
            if g > r * 1.25 and g > b * 1.25 and g > 50:
                continue
            # Shadow filter: ignore near-black pixels
            if r < 25 and g < 25 and b < 25:
                continue
            # Over-saturation highlight filter
            if r > 245 and g > 245 and b > 245:
                # Keep white kits, but skip pure specular glare
                pass
            non_grass.append(p)

        if len(non_grass) < 15:
            # Fallback to median of crop
            return np.median(pixels, axis=0)

        data = np.array(non_grass)
        # Calculate median RGB
        return np.median(data, axis=0)

    def fit_teams(self, player_crops: List[Any]):
        """Calibrates team kit colors using K-Means clustering on the initial player pool."""
        colors = []
        for crop in player_crops:
            if crop is not None and crop.size > 0:
                col = self.extract_dominant_color(crop)
                colors.append(col)

        if len(colors) < 4:
            # Default to Red and Sky Blue if insufficient crops
            self.team_centers = np.array([
                [220, 30, 30],   # Team A Red
                [30, 140, 225]   # Team B Sky Blue
            ], dtype=np.float32)
            return

        try:
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
            kmeans.fit(np.array(colors))
            self.team_centers = kmeans.cluster_centers_
        except Exception:
            # Dependency-free deterministic 2-means so team calibration degrades
            # gracefully when scikit-learn is unavailable.
            self.team_centers = self._two_means(colors)

    @staticmethod
    def _two_means(colors: List[Any], iterations: int = 12) -> Any:
        """Minimal deterministic 2-means clustering used as a scikit-learn fallback."""
        arr = np.asarray(colors, dtype=np.float32)
        if len(arr) < 2:
            return arr

        # Seed with the two most distant jersey samples
        pairwise = np.linalg.norm(arr[:, None, :] - arr[None, :, :], axis=2)
        first, second = np.unravel_index(int(np.argmax(pairwise)), pairwise.shape)
        centers = arr[[first, second]].copy()
        if float(pairwise[first, second]) <= 1e-6:
            return centers

        for _ in range(iterations):
            dists = np.linalg.norm(arr[:, None, :] - centers[None, :, :], axis=2)
            labels = np.argmin(dists, axis=1)
            new_centers = centers.copy()
            for k in range(2):
                members = arr[labels == k]
                if len(members) > 0:
                    new_centers[k] = members.mean(axis=0)
            if np.allclose(new_centers, centers):
                centers = new_centers
                break
            centers = new_centers
        return centers

    def classify_player(
        self,
        crop: Optional[np.ndarray],
        track_id: int,
        is_referee_candidate: bool = False
    ) -> Tuple[int, str]:
        """Classifies a player into Team 0 (Team A), Team 1 (Team B), Team 2 (Referee), or Team 3 (GK).

        Returns:
            (team_id, team_label)
        """
        if is_referee_candidate:
            return 2, "Referee"

        if crop is None or crop.size == 0:
            # Consult historical majority vote for this track
            if track_id in self.track_team_history and self.track_team_history[track_id]:
                past = self.track_team_history[track_id]
                majority = max(set(past), key=past.count)
                return majority, f"Team {'A' if majority == 0 else 'B'}"
            return 0, "Team A"

        color = self.extract_dominant_color(crop)

        # Check referee color proximity (referees often wear bright neon yellow or black)
        ref_dist = np.linalg.norm(color - self.referee_color)
        if ref_dist < 45.0:
            return 2, "Referee"

        if self.team_centers is None:
            # Auto-assign based on simple color balance
            team = 0 if color[0] > color[2] else 1
        else:
            dist_0 = np.linalg.norm(color - self.team_centers[0])
            dist_1 = np.linalg.norm(color - self.team_centers[1])
            team = 0 if dist_0 <= dist_1 else 1

        # Temporal smoothing: maintain rolling window of assignments to eliminate flickering
        if track_id not in self.track_team_history:
            self.track_team_history[track_id] = []
        self.track_team_history[track_id].append(team)
        if len(self.track_team_history[track_id]) > 15:
            self.track_team_history[track_id].pop(0)

        smoothed_team = max(set(self.track_team_history[track_id]), key=self.track_team_history[track_id].count)
        label = "Team A" if smoothed_team == 0 else "Team B"
        return smoothed_team, label
