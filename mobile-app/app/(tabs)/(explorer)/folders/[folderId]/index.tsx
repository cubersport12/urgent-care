import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { useFolders, useArticles, AppFolderVm, AppArticleVm } from '@/hooks/api';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, FileCode, Folder } from 'lucide-react-native';
import { View } from 'react-native';

export default function FolderScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { data: folders } = useFolders(folderId ?? '');
  const { data: articles } = useArticles(folderId ?? '');
  const handlePressFolder = (folder: AppFolderVm) => {
    router.navigate({ pathname: '/folders/[folderId]', params: { folderId: folder.id } });
  };
  const handlePressArticle = (article: AppArticleVm) => {
    router.navigate({ pathname: '/folders/[folderId]/documents/[articleId]', params: { articleId: article.id, folderId: folderId } });
  };
  const elementClasses = 'w-full flex justify-start border-b border-gray-400';
  return (
    <View>
      <VStack className="gap-2 p-2">
        {
          folders?.map(folder => (
            <Button variant="link" className={elementClasses} key={folder.id} onPress={() => handlePressFolder(folder)}>
              <ButtonIcon as={Folder} />
              <ButtonText className="grow">{folder.name}</ButtonText>
              <ButtonIcon size="lg" as={ChevronRight} />
            </Button>
          ))
        }
        {
          articles?.map(article => (
            <Button variant="link" className={elementClasses} key={article.id} onPress={() => handlePressArticle(article)}>
              <ButtonIcon as={FileCode} />
              <ButtonText className="grow">{article.name}</ButtonText>
            </Button>
          ))
        }
      </VStack>
    </View>
  );
}
