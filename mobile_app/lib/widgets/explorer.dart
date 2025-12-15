import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_app/services/folders.dart';

class _CurrentParentIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void setParentId(String? id) {
    state = id;
  }
}

final _currentParentIdProvider =
    NotifierProvider<_CurrentParentIdNotifier, String?>(
  () => _CurrentParentIdNotifier(),
);

class Explorer extends ConsumerWidget {
  const Explorer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentParentId = ref.watch(_currentParentIdProvider);
    final foldersAsync = ref.watch(foldersProvider(currentParentId));

    return foldersAsync.when(
      data: (folders) {
        if (folders.isEmpty) {
          return Column(
            children: [
              if (currentParentId != null)
                AppBar(
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () {
                      ref.read(_currentParentIdProvider.notifier).setParentId(null);
                    },
                  ),
                  title: const Text('Назад'),
                  automaticallyImplyLeading: false,
                ),
              const Expanded(
                child: Center(child: Text('Папок нет')),
              ),
            ],
          );
        }

        return Column(
          children: [
            if (currentParentId != null)
              AppBar(
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () {
                    ref.read(_currentParentIdProvider.notifier).setParentId(null);
                  },
                ),
                title: const Text('Назад'),
                automaticallyImplyLeading: false,
              ),
            Expanded(
              child: ListView.separated(
                itemCount: folders.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final folder = folders[index];
                  final folderId = folder['id']?.toString();
                  final title = (folder['name'] ??
                          folder['title'] ??
                          folder['id'] ??
                          'Без названия')
                      .toString();

                  return ListTile(
                    leading: const Icon(Icons.folder),
                    title: Text(title),
                    onTap: folderId != null
                        ? () {
                            ref.read(_currentParentIdProvider.notifier).setParentId(folderId);
                          }
                        : null,
                  );
                },
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) {
        return Center(child: Text('Ошибка загрузки: $error'));
      },
    );
  }
}
