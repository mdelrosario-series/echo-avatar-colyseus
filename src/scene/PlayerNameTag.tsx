import { Billboard, Text } from '@react-three/drei';
import { getCdnUrl } from '../lib/cdnAssets';

interface PlayerNameTagProps {
  username: string;
  /** Height above the group origin. Defaults to 2.2 to clear a standard avatar. */
  yOffset?: number;
}

const MAX_NAME_LENGTH = 18;

function truncateName(name: string): string {
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH)}...` : name;
}

export function PlayerNameTag({ username, yOffset = 2.2 }: PlayerNameTagProps) {
  return (
    <Billboard>
      <Text
        position={[0, yOffset, 0]}
        font={getCdnUrl('FONT_MIKODACS')}
        fontSize={0.18}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#000000"
        renderOrder={1}
        material-depthTest={false}
      >
        {truncateName(username)}
      </Text>
    </Billboard>
  );
}
