from django.contrib.auth.models import User, Group
from django.db.models import Max
from rest_framework import viewsets, views, permissions
from rest_framework.response import Response
from rest_auth.registration.views import RegisterView
from fuzzywuzzy import fuzz, process
from collections import OrderedDict

from . import models, serializers

class AllowMetadata(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in ['OPTIONS', 'HEAD']


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = serializers.UserSerializer


search_strings = {}
def gen_search_strings():
    for m in models.Member.objects.all():
        string = '{} {}  {} {}'.format(
            m.preferred_name,
            m.last_name,
            m.first_name,
            m.last_name,
        ).lower()
        search_strings[string] = m.id
gen_search_strings()

class SearchViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowMetadata | permissions.IsAuthenticated]
    serializer_class = serializers.OtherMemberSerializer

    def get_queryset(self):
        NUM_SEARCH_RESULTS = 10

        queryset = models.Member.objects.all()
        params = self.request.query_params

        if 'q' in params and len(params['q']) >= 3:
            search = params['q'].lower()
            choices = search_strings.keys()

            # get exact starts with matches
            results = [x for x in choices if x.startswith(search)]
            # then get exact substring matches
            results += [x for x in choices if search in x]
            # then get fuzzy matches
            fuzzy_results = process.extract(search, choices, limit=NUM_SEARCH_RESULTS, scorer=fuzz.token_set_ratio)
            results += [x[0] for x in fuzzy_results]

            # remove dupes
            results = list(OrderedDict.fromkeys(results))

            result_ids = [search_strings[x] for x in results]
            result_objects = [queryset.get(id=x) for x in result_ids]

            queryset = result_objects
        else:
            queryset = queryset.order_by('-vetted_date')

        return queryset[:NUM_SEARCH_RESULTS]


class MemberViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowMetadata | permissions.IsAuthenticated]
    http_method_names = ['options', 'head', 'get', 'put', 'patch']

    def get_queryset(self):
        objects = models.Member.objects.all()
        if self.request.user.is_staff:
            return objects.order_by('id')
        else:
            return objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.user.is_staff:
            return serializers.AdminMemberSerializer
        else:
            return serializers.MemberSerializer


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowMetadata | permissions.IsAuthenticated]
    queryset = models.Course.objects.annotate(date=Max('sessions__datetime')).order_by('-date')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return serializers.CourseDetailSerializer
        else:
            return serializers.CourseSerializer


class SessionViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowMetadata | permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action == 'list':
            return models.Session.objects.order_by('-datetime')[:20]
        else:
            return models.Session.objects.all()

    def get_serializer_class(self):
        #if self.action == 'retrieve':
        #    return serializers.CourseDetailSerializer
        #else:
        return serializers.SessionSerializer


class MyUserView(views.APIView):
    permission_classes = [AllowMetadata | permissions.IsAuthenticated]

    def get(self, request):
        serializer = serializers.UserSerializer(request.user)
        return Response(serializer.data)


class RegistrationViewSet(RegisterView):
    serializer_class = serializers.RegistrationSerializer

    #def create(self, request):
    #    data = request.data.copy()
    #    data['username'] = '{}.{}'.format(
    #        data['first_name'],
    #        data['last_name']
    #    ).lower()
    #    request._full_data = data
    #    return super().create(request)

