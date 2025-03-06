import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { DocumentKind } from '@/constants/DocumentKind';
import { useFolders, useArticles, AppFolderVm, AppArticleVm } from '@/hooks/api';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, FileCode, Folder } from 'lucide-react-native';

export default function FolderScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { data: folders } = useFolders(folderId ?? '');
  const { data: articles } = useArticles(folderId ?? '');
  const handlePressFolder = (folder: AppFolderVm) => {
    router.navigate({ pathname: '/[folderId]', params: { folderId: folder.id } });
  };
  const handlePressArticle = (article: AppArticleVm) => {
    router.navigate({ pathname: '/[folderId]/[documentId]', params: { documentId: article.id, folderId: folderId, kind: DocumentKind.Article } });
  };
  const elementClasses = 'w-full flex justify-start border-b border-gray-400';
  return (
    <>
      <div className="flex flex-col justify-start p-2">
        {
          folders?.map(folder => (
            <div className={elementClasses} key={folder.id}>
              <Button variant="link" className="w-full" onPress={() => handlePressFolder(folder)}>
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
              <Button variant="link" className="w-full" onPress={() => handlePressArticle(article)}>
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
