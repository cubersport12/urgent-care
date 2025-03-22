import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { useFolders, AppFolderVm } from '@/hooks/api';
import { router } from 'expo-router';

export default function Index() {
  const { data } = useFolders();
  const handlePressFolder = (folder: AppFolderVm) => {
    router.navigate({ pathname: '/folders/[folderId]', params: { folderId: folder.id } });
  };
  return (
    <Box className="w-full h-full overflow-hidden relative">
      <Box className="flex flex-col gap-1 absolute right-3 bottom-3">
        {
          data?.map(folder => (
            <Button key={folder.id} onPress={() => handlePressFolder(folder)}>
              <ButtonText>{folder.name}</ButtonText>
            </Button>
          ))
        }
      </Box>
    </Box>
  );
}
