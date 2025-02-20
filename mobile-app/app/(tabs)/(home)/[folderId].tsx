import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { useArticles, useFolder, useFolders } from '@/hooks/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Folder, FileCode, ChevronLeft, ChevronRight } from 'lucide-react-native';

export default function FolderExplorer() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { data } = useFolder(folderId);
  const { data: folders } = useFolders(folderId);
  const { data: articles } = useArticles(folderId);
  const handlePressFolder = (folderId: string) => {
    router.navigate({ pathname: '/[folderId]', params: { folderId: folderId } });
  };
  const elementClasses = 'w-full flex justify-start border-b border-gray-400';
  return (
    <>
      <div className="flex flex-col justify-start p-2">
        {
          data?.parentId && (
            <div className="w-full flex justify-start">
              <Button variant="link" onPress={() => handlePressFolder(data.parentId!)}>
                <ButtonIcon as={ChevronLeft} />
                <ButtonText>Назад</ButtonText>
              </Button>
            </div>
          )
        }
        {
          folders?.map(folder => (
            <div className={elementClasses} key={folder.id}>
              <Button variant="link" className="w-full" onPress={() => handlePressFolder(folder.id)}>
                <ButtonIcon as={Folder} />
                <ButtonText className="grow">{folder.name}</ButtonText>
                <ButtonIcon size="lg" as={ChevronRight} />
              </Button>
            </div>
          ))
        }
        {
          articles?.map(article => (
            <div className={elementClasses} key={article.id}>
              <Button variant="link" className="w-full">
                <ButtonIcon as={FileCode} />
                <ButtonText className="grow">{article.name}</ButtonText>
              </Button>
            </div>
          ))
        }
      </div>
    </>
  );
}
