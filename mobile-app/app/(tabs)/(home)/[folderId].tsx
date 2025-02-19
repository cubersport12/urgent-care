import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { useArticles, useFolder, useFolders } from '@/hooks/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Folder, FileCode, ChevronLeft } from 'lucide-react-native';

export default function FolderExplorer() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { data } = useFolder(folderId);
  const { data: folders } = useFolders(folderId);
  const { data: articles } = useArticles(folderId);
  const handlePressFolder = (folderId: string) => {
    router.navigate({ pathname: '/[folderId]', params: { folderId: folderId } });
  };
  return (
    <>
      <div className="flex flex-col justify-start p-2">
        {
          data?.parentId && (
            <div className="w-full flex justify-start border-b-2 border-primary-200">
              <Button variant="link" onPress={() => handlePressFolder(data.parentId!)}>
                <ButtonIcon as={ChevronLeft} />
                <ButtonText>Назад</ButtonText>
              </Button>
            </div>
          )
        }
        {
          folders?.map(folder => (
            <div className="w-full flex justify-start">
              <Button variant="link" key={folder.id + '_folder'} onPress={() => handlePressFolder(folder.id)}>
                <ButtonIcon as={Folder} />
                <ButtonText>{folder.name}</ButtonText>
              </Button>
            </div>
          ))
        }
        {
          articles?.map(article => (
            <div className="w-full flex justify-start">
              <Button variant="link" key={article.id + '_article'}>
                <ButtonIcon as={FileCode} />
                <ButtonText>{article.name}</ButtonText>
              </Button>
            </div>
          ))
        }
      </div>
    </>
  );
}
