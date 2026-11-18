# Sample match artefacts

`demo_match.json` is produced by the synthetic engine demo and includes a 20 second replay
timeline (75 tracked samples at 4 Hz, 20 players, 16 events):

```bash
python main.py --mode demo --max-frames 600 --export-json demo_match.json
```

It follows the `matchvision.match.v1` contract and can be uploaded to the Match library to try
the report and the **studio replay** without a video file, YOLO weights or a Python install.
