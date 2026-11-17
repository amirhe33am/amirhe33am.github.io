import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { ReelAnimation } from "./ReelAnimation";
import { PeopleToAvoid, PEOPLE_TO_AVOID_DURATION } from "./explainer/PeopleToAvoid";
import { PeopleToAvoidDark } from "./explainer/PeopleToAvoidDark";
import { FivePeopleKinetic, KINETIC_DURATION } from "./kinetic/FivePeopleKinetic";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="FivePeopleKinetic"
    component={FivePeopleKinetic}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.ceil(KINETIC_DURATION * FPS)}
  />
  <Composition
    id="PeopleToAvoidDark"
    component={PeopleToAvoidDark}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.ceil(PEOPLE_TO_AVOID_DURATION * FPS)}
  />
  <Composition
    id="PeopleToAvoid"
    component={PeopleToAvoid}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.ceil(PEOPLE_TO_AVOID_DURATION * FPS)}
  />
  <Composition
    id="ReelAnimation"
    component={ReelAnimation}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 15}
    defaultProps={{ audioFile: "audio.mp3" }}
    // Video length follows the length of the sound automatically
    calculateMetadata={async ({ props }) => {
      const seconds = await getAudioDurationInSeconds(staticFile(props.audioFile));
      return { durationInFrames: Math.max(1, Math.ceil(seconds * FPS)) };
    }}
  />
  </>
);
