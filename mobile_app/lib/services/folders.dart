import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FoldersService {
  FoldersService({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  /// Загружает папки по `parentId` (null => корень).
  Future<List<Map<String, dynamic>>> fetchFolders({String? parentId}) async {
    var query = _client.from('folders').select();

    query = parentId == null
        ? query.filter('parentId', 'is', null)
        : query.eq('parentId', parentId);

    final List<dynamic> response = await query;
    return response.cast<Map<String, dynamic>>();
  }
}

final foldersServiceProvider = Provider<FoldersService>(
  (ref) => FoldersService(),
);


final foldersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String?>(
  (ref, parentId) {
    final service = ref.watch(foldersServiceProvider);
    return service.fetchFolders(parentId: parentId);
  },
);
