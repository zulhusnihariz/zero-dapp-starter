import ChainName from "components/ChainName"
import MusicCard from "components/MusicCard"
import ShareDialog from "components/ShareDialog"
import { PlayerState, Sheet } from "lib"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { createMixedAudio } from "utils"
import AddMusicIcon from 'assets/icons/addmusic.svg'
import { keccak256 } from "@ethersproject/keccak256"

const PageNft = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const { nft } = location.state || {}

  const [latestVersion, setLatestVersion] = useState(0)
  const [sheets, setSheets] = useState<Sheet[]>([])

  useEffect(() => {
    if(!nft) {
      navigate('/inventory')
    }
    
  }, [nft, navigate])

  const [shareDialogState, setShareDialogState] = useState({
    dataKey: '',
    opened: false,
  });

  useEffect(() => {
    const getSheetVersions = async () => {
      let v = 0
      const sheets: Sheet[] = []

      // eslint-disable-next-line no-constant-condition
      while(true) {
        const input = `${nft.address}${nft.token_id}${'binance'}${v}`
        const key = keccak256(input).substring(2)
        
        const res = await fetch(`${import.meta.env.VITE_LINEAGE_METADATA_URL}/${key}`)
        const metadata = await res.json()
        if(metadata && metadata.length > 0) {
          sheets.push({
            data_key: key,
            version: v.toString()
          })
          v++
        } else {
          setLatestVersion(v)
          break
        }
      }
    }

    getSheetVersions()
  }, [nft, setSheets])

  const [audioContext, setAudioContext] = useState(new AudioContext());
  const [audioPlayerState, setAudioPlayerState] = useState<{ [key: string]: PlayerState }>({});
  const [mixedAudio, setMixedAudio] = useState<{ [key: string]: AudioBuffer } | null>({});

  const updatePlayerState = (dataKey: string, state: PlayerState) => {
    setAudioPlayerState(prev => ({
      ...prev,
      [dataKey]: state,
    }));
  };

  const playerButtonHandler = async (dataKey: string) => {
    const isFirstPlay = audioPlayerState[dataKey] === undefined;

    if (isFirstPlay) {
      updatePlayerState(dataKey, PlayerState.LOADING);

      const mixed = await createMixedAudio(audioContext, dataKey);

      updatePlayerState(dataKey, PlayerState.PLAY);

      setMixedAudio(prev => ({
        ...prev,
        [dataKey]: mixed,
      }));
      return;
    }

    switch (audioPlayerState[dataKey]) {
      case PlayerState.STOP:
        updatePlayerState(dataKey, PlayerState.PLAY);
        break
      case PlayerState.PLAY:
        updatePlayerState(dataKey, PlayerState.PAUSED);
        break;
      case PlayerState.PAUSED:
        updatePlayerState(dataKey, PlayerState.PLAY);
        break;
      default:
        break;
    }
  };

  return (
    <>
      {nft && <div className="flex justify-center">
      <div className="block w-3/4">
        <div className="bg-[#181818] rounded p-4">
          <div className="flex">
            <div className="flex-auto w-1/4">
              <img src={nft.metadata.image} className="rounded-lg bg-white w-full h-full"/>
            </div>
            <div className="flex-auto w-3/4 px-5">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{nft.metadata.name}</span>
              </div>
              <div>
                <div className="flex justify-between text-gray-400 text-sm my-2">
                  <div className="">Address: {nft.address} <span className="mx-3">&#8226;</span> #{nft.token_id} <span className="mx-3">&#8226;</span> <ChainName chainId="56" /></div>
                </div>
                <p className="">
                  {nft.metadata.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-[#181818] rounded p-4">
          <div className="text-2xl font-semibold mb-4">Release Audios</div>
          <div className="font-xs text-gray-400">You have have not release any audios yet</div>
        </div>
        
        <div className="mt-5 bg-[#181818] rounded p-4">
          <div className="text-2xl font-semibold mb-4">Unrelease Audios</div>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-4">
            <div className="bg-red-900 rounded-lg px-4 py-2 text-white w-full flex items-center justify-center cursor-pointer hover:border hover:border-white">
              <div className="block">
                <img src={AddMusicIcon} className="mx-auto" />
                <div className="text-sm mt-1">New Audio</div>
              </div>
            </div>
          {sheets.map((sheet, index) => (
            <MusicCard
              sheet={sheet}
              key={index}
              version={sheet.version}
              name={sheet.data_key.toString()}
              description={''}
              audioUrls={[]}
              onHandleShareClicked={dataKey =>
                setShareDialogState({
                  dataKey,
                  opened: true,
                })
              }
              onHandlePlayClicked={playerButtonHandler}
              updatePlayerState={updatePlayerState}
              audioState={audioPlayerState}
              mixedAudio={mixedAudio ? mixedAudio[sheet.data_key.toString()] : undefined}
            />
          ))}
          </div>
        </div>

        {shareDialogState.opened && (
          <ShareDialog
            dataKey={shareDialogState.dataKey}
            onHandleCloseClicked={() =>
              setShareDialogState({
                dataKey: '',
                opened: false,
              })
            }
          />
        )}
      </div>
    </div>}
    </>
  )
}

export default PageNft