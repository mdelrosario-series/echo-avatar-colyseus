import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng';

// Suppress Agora's verbose internal logs
AgoraRTC.setLogLevel(4);

const APP_ID = import.meta.env['VITE_AGORA_APP_ID'] as string;

export function useVoiceChat(channelId: string | null, uid: string | null, volume = 1) {
  const clientRef       = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef   = useRef<ILocalAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());
  const volumeRef       = useRef(volume);
  volumeRef.current = volume;

  const [isMuted,       setIsMuted]       = useState(true);
  const [isConnected,   setIsConnected]   = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // Apply volume changes to all currently playing remote tracks
  useEffect(() => {
    const vol = Math.round(volume * 100);
    remoteTracksRef.current.forEach((track) => track.setVolume(vol));
  }, [volume]);

  useEffect(() => {
    if (!channelId || !uid || !APP_ID) return;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (user, mediaType) => {
      if (mediaType !== 'audio') return;
      await client.subscribe(user, 'audio');
      const track = user.audioTrack!;
      track.setVolume(Math.round(volumeRef.current * 100));
      track.play();
      remoteTracksRef.current.set(String(user.uid), track);
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        user.audioTrack?.stop();
        remoteTracksRef.current.delete(String(user.uid));
      }
    });

    client.on('user-left', (user) => {
      remoteTracksRef.current.delete(String(user.uid));
    });

    // Speaking detection — fires every ~2s with volume levels per UID
    client.enableAudioVolumeIndicator();
    client.on('volume-indicator', (volumes) => {
      const speaking = new Set<string>(
        volumes.filter((v) => v.level > 5).map((v) => String(v.uid)),
      );
      setSpeakingUsers(speaking);
    });

    async function join() {
      try {
        await client.join(APP_ID, channelId!, null, uid);
        const track = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'music_standard' });
        localTrackRef.current = track;
        // Must publish while enabled — Agora throws TRACK_IS_DISABLED if you publish a disabled track.
        await client.publish([track]);
        await track.setEnabled(false); // start muted (after publish)
        setIsMuted(true);
        setIsConnected(true);
      } catch (err) {
        console.warn('[VoiceChat] join failed — mic permission denied or Agora error', err);
      }
    }

    void join();

    return () => {
      localTrackRef.current?.stop();
      localTrackRef.current?.close();
      localTrackRef.current = null;
      remoteTracksRef.current.clear();
      void client.leave();
      client.removeAllListeners();
      clientRef.current = null;
      setIsConnected(false);
      setIsMuted(true); // default for next entry / while disconnected
      setSpeakingUsers(new Set());
    };
  }, [channelId, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => {
    const track = localTrackRef.current;
    if (!track) return;
    const next = !isMuted;
    void track.setEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  return { isMuted, toggleMute, speakingUsers, isConnected };
}
