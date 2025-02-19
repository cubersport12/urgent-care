import { Button, ButtonText } from '@/components/ui/button';
import { AppFolderVm, useFolders } from '@/hooks/api';
import { router } from 'expo-router';

export default function Index() {
  const { data } = useFolders();
  const handlePressFolder = (f: AppFolderVm) => {
    router.navigate({ pathname: '/[folderId]', params: { folderId: f.id } });
  };
  return (
    <div className="w-full h-full overflow-hidden relative">
      <div className="flex flex-col gap-1 absolute right-3 bottom-3">
        {
          data?.map(folder => (
            <Button key={folder.id} onPress={() => handlePressFolder(folder)}>
              <ButtonText>{folder.name}</ButtonText>
            </Button>
          ))
        }
      </div>
    </div>
  );
}
